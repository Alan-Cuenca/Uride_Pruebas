# 🚀 Guía Definitiva de Ejecución de Pruebas (U-Ride)

Para que las 177 pruebas del sistema pasen siempre en verde, es fundamental preparar correctamente el estado de la base de datos y tener los servicios corriendo en el orden adecuado.

---

## 🛠️ Prerrequisitos Globales
Antes de iniciar cualquier prueba E2E (Frontend o Mobile), debes asegurarte de tener **tres terminales** ejecutando los entornos de desarrollo:

1. **Terminal 1 (Backend):** 
   ```bash
   cd backend
   npm run dev
   ```
   *(Debe estar corriendo en `http://localhost:5000`)*

2. **Terminal 2 (Frontend):** 
   ```bash
   cd frontend
   npm run dev
   ```
   *(Debe estar corriendo en `http://localhost:5173`)*

3. **Terminal 3 (Mobile):** 
   ```bash
   cd mobile
   npx expo start --web
   ```
   *(Debe estar corriendo en `http://localhost:8081`)*

---

## 🖥️ 1. Pruebas del Backend (Jest)

Las pruebas del backend son pruebas unitarias y de integración. Gran parte de la lógica está "mockeada", por lo que **no requieren preparar la base de datos**. Puedes ejecutarlas en cualquier momento.

**Cómo ejecutarlas:**
1. Abre una nueva terminal.
2. Navega a la carpeta del backend:
   ```bash
   cd backend
   ```
3. Ejecuta el comando de Jest:
   ```bash
   npm run test
   # o alternativamente: npx jest
   ```

✅ **Resultado esperado:** 150 pruebas pasadas en un par de segundos.

---

## 🌐 2. Pruebas del Frontend Admin (Cypress)

El frontend de React tiene pruebas E2E que verifican el inicio de sesión y la tabla de reportes. Estas pruebas **sí exigen que la base de datos tenga datos específicos** para que Cypress encuentre los reportes correctos al visitar el Dashboard.

**Cómo ejecutarlas:**
1. En una nueva terminal, ve al backend y **prepara la base de datos**:
   ```bash
   cd backend
   node cleanDB.js
   node seed.js
   ```
   *(Esto limpia la BD e inserta exactamente 2 reportes y 1 usuario administrador).*
2. Ahora, ve a la carpeta del frontend:
   ```bash
   cd ../frontend
   ```
3. Abre la interfaz visual de Cypress o ejecútalas en la terminal:
   ```bash
   npm run cypress:open    # Para ver cómo se ejecutan visualmente
   # o
   npx cypress run         # Para ejecución automática silenciosa
   ```

✅ **Resultado esperado:** 10 specs pasadas.

---

## 📱 3. Pruebas de la App Móvil (Cypress)

Las pruebas móviles simulan el ciclo de vida completo: un pasajero pide un viaje, un conductor acepta y luego se cobra. Para que esto funcione sin conflictos de tiempos o interfaces saturadas, **la base de datos debe estar limpia** de viajes anteriores.

**Cómo ejecutarlas:**
1. En una terminal, ve al backend y **limpia la base de datos** (No inyectes `seed.js` aquí, ya que los Cypress móviles crean sus propios usuarios):
   ```bash
   cd backend
   node cleanDB.js
   ```
2. Ahora, ve a la carpeta de la aplicación móvil:
   ```bash
   cd ../mobile
   ```
3. Ejecuta Cypress (se recomienda interfaz visual para móviles debido al flujo secuencial):
   ```bash
   npx cypress open
   ```
4. En la ventana de Cypress, selecciona **E2E Testing**, elige un navegador (Electron o Chrome) y haz clic en la carpeta para correr todos los archivos `01` al `09` en orden.

✅ **Resultado esperado:** 9 specs pasados en secuencia (desde el registro hasta la calificación final).
