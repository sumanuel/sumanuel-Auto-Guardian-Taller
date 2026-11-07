import { useEffect, useState } from "react";
import { Alert } from "react-native";
import FormField from "../components/common/FormField";
import FormScreen from "../components/common/FormScreen";
import { createClient, updateClient } from "../services/clients/clientService";

function getClientId(client) {
  return client?.refId || client?.id || null;
}

function buildClientForm(client) {
  return {
    identification: client?.identification || "",
    fullName: client?.fullName || "",
    address: client?.address || "",
    phone: client?.phone || "",
    email: client?.email || "",
    notes: client?.notes || "",
  };
}

export default function ClientFormScreen({
  initialClient,
  onBack,
  onSaved,
  userProfile,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(buildClientForm(initialClient));

  const editingClientId = getClientId(initialClient);
  const setField = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setForm(buildClientForm(initialClient));
  }, [initialClient]);

  const handleSubmit = async () => {
    if (!form.fullName.trim()) {
      Alert.alert("Clientes", "Ingresa al menos el nombre del cliente.");
      return;
    }

    setSubmitting(true);

    try {
      let savedClientId = editingClientId;

      if (editingClientId) {
        await updateClient(editingClientId, form);
      } else {
        const createdClient = await createClient({
          ...form,
          createdByUid: userProfile?.uid,
        });
        savedClientId = createdClient.id;
      }

      Alert.alert(
        "Clientes",
        editingClientId
          ? "El cliente fue actualizado."
          : "El cliente fue creado correctamente.",
      );
      onSaved?.(savedClientId);
    } catch (error) {
      Alert.alert(
        "Clientes",
        error?.message || "No se pudo guardar el cliente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      actionLabel={
        submitting
          ? "Guardando cliente..."
          : editingClientId
            ? "Guardar cambios"
            : "Crear cliente"
      }
      onBack={onBack}
      onSubmit={handleSubmit}
      section="Clientes"
      submitting={submitting}
      subtitle="Nombre y datos de contacto para avisarle del avance."
      title={editingClientId ? "Editar cliente" : "Registrar cliente"}
    >
      <FormField
        label="Nombre completo"
        onChangeText={setField("fullName")}
        placeholder="Cliente principal"
        value={form.fullName}
      />
      <FormField
        hint="Se usa para llamar o escribir por WhatsApp."
        keyboardType="phone-pad"
        label="Teléfono"
        onChangeText={setField("phone")}
        placeholder="0412-0000000"
        value={form.phone}
      />
      <FormField
        label="Identificación"
        onChangeText={setField("identification")}
        placeholder="V-12345678"
        value={form.identification}
      />
      <FormField
        autoCapitalize="none"
        keyboardType="email-address"
        label="Correo"
        onChangeText={setField("email")}
        placeholder="cliente@correo.com"
        value={form.email}
      />
      <FormField
        label="Dirección"
        onChangeText={setField("address")}
        placeholder="Sector, avenida, referencia"
        value={form.address}
      />
      <FormField
        label="Notas"
        multiline
        onChangeText={setField("notes")}
        placeholder="Preferencias, observaciones o instrucciones de atención"
        value={form.notes}
      />
    </FormScreen>
  );
}
