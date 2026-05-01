---
description: "Use when designing or editing Auto-Guardian-Taller mobile UI in screens, navigation, theme, responsive layout, or reusable components. Inherits the premium operational style from Auto-Guardian for workshop flows."
name: "Auto-Guardian-Taller UI"
applyTo: "App.js,src/screens/**/*.js,src/components/**/*.js,src/navigation/**/*.js,src/context/ThemeContext.js,src/utils/responsive.js"
---

# Auto-Guardian-Taller UI Guidelines

- Preserve the premium, technical, minimalist language established in Auto-Guardian.
- Design for fast workshop decisions: reception, diagnosis, service progress, parts approval, delivery, and cost control.
- Show urgent operational signals first, then vehicle or order context, then supporting metadata.
- Keep one dominant action per screen and avoid noisy dashboards.
- Use the shared helpers from src/utils/responsive.js and src/context/ThemeContext.js instead of ad hoc spacing or color values when practical.
- Prefer grouped cards, summary blocks, timeline rows, and labeled sections over flat long layouts.
- Status, estimated delivery, mileage, costs, assigned technician, and parts state should be easy to scan.
- Use color semantically for urgency, progress, and action intent. Avoid decorative color use.
- Keep copy concise, operational, and in Spanish.
- Empty states should explain the next workshop action clearly, such as creating the first order, adding a vehicle, or recording a received payment.
