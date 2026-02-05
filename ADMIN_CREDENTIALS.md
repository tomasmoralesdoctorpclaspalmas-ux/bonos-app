# 🔐 Credenciales de Administrador

## Usuario Administrador por Defecto

El sistema crea automáticamente un usuario administrador cuando cargas la aplicación por primera vez.

### Credenciales

```
📧 Email:      admin@bonos.local
🔑 Contraseña: Bonos@Admin2026!Secure
```

### Primer Inicio de Sesión

1. Asegúrate de que Firebase esté configurado (ver FIREBASE_SETUP.md)
2. Inicia el servidor: `npm run dev`
3. Abre http://localhost:5173
4. La consola del navegador mostrará si el admin fue creado
5. Inicia sesión con las credenciales de arriba

### Cambiar Contraseña

**Importante**: Por seguridad, cambia la contraseña después del primer inicio de sesión.

Puedes hacerlo desde:
- Firebase Console → Authentication → Usuarios → Editar
- O implementar función de cambio de contraseña en la app

### Crear Más Administradores

Una vez dentro del sistema:
1. Ve a "Gestión de Usuarios"
2. Clic en "Nuevo Usuario"
3. Selecciona rol "Administrador"
4. Completa el formulario

### Notas de Seguridad

⚠️ **Para producción**:
- Cambia la contraseña por defecto
- Usa contraseñas únicas para cada admin
- Considera implementar autenticación de dos factores
- Revisa las reglas de seguridad de Firestore

### Solución de Problemas

**Error: "Email already in use"**
- El admin ya fue creado anteriormente
- Usa las credenciales de arriba para iniciar sesión

**Error: "User not found in database"**
- El usuario existe en Auth pero no en Firestore
- Verifica que el script de inicialización se ejecutó correctamente
- Revisa la consola del navegador para ver logs

**No puedo crear el admin**
- Verifica que Firebase esté configurado correctamente
- Asegúrate de que Authentication esté habilitado
- Revisa que las variables de entorno estén en `.env`
