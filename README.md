# H Morgan Bar (Next.js 14 + TypeScript + Tailwind + MongoDB)

Sistema de fidelización para bar/resto con dos lados:
- **Cliente**: registro, login, QR único, ver puntos.
- **Admin/Mozo**: escanear QR y sumar puntos por consumo.

## Requisitos
- Node 18+
- MongoDB Atlas (cadena MONGODB_URI)

## Configuración
1. Copiá `.env.local.example` a `.env.local` y completá los valores.
2. Instalá dependencias:
   ```bash
   npm install
   ```
3. Seed de un usuario admin (opcional):
   ```bash
   npm run seed:admin
   ```
4. Development:
   ```bash
   npm run dev
   ```

## Rutas
- `/register`, `/login`
- `/cliente/qr` (protegida)
- `/admin/scan` (protegida por rol admin)

## Notas
- La contraseña provisional del cliente se genera como `nombre + dni`, **pero se guarda hasheada**.
- El QR contiene un `qrToken` opaco (no expone el DNI).
