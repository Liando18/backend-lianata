# LianataFinance Backend API

Dokumentasi resmi API Backend untuk aplikasi manajemen keuangan **LianataFinance**.

**Developer: Aprilian Gevindo, M.Kom.**

---

## 🛠️ Tech Stack & Arsitektur

- **Framework**: Next.js 16 (App Router & Route Handlers)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM & Drizzle Kit
- **AI Model**: OpenRouter AI (Free tier auto-routing) dengan Smart Fallback Parser
- **Otentikasi**: JWT (Access Token 1 Jam via Jose Web Crypto) + Refresh Token Rotation (30 Hari di Database)
- **Validasi**: Zod v4
- **Keamanan**: Bcrypt (Salt rounds 12), Timing Attack Protection, Role-based Access Control (Admin & User)

---

## 🛡️ Matriks Keamanan & Mitigasi Teknis

| Jenis Serangan | Komponen Terdampak | Langkah Pencegahan & Implementasi di LianataFinance |
|---|---|---|
| **BOLA / IDOR** | Route Handlers (`transactions`, `chat`) | Verifikasi token di baris pertama via `authenticateRequest()`. Hak kepemilikan resource dicek ketat (`existing.userId === user.id`). Parameter `userId` dari payload diabaikan. |
| **SSRF** | Outgoing AI Fetch (`lib/ai/openrouter.ts`) | Validasi protokol `https:` dan allowlist host ketat hanya untuk `openrouter.ai`. Tidak menerima URL eksternal dari input pengguna. |
| **Cache Poisoning** | Route Handlers & Data Cache | Header keamanan `Cache-Control: no-store, no-cache, must-revalidate` diterapkan otomatis ke seluruh endpoint `/api/*`. |
| **Secrets Leaking** | Client/Server Boundary | Modul sensitif (`db/index.ts`, `lib/ai/openrouter.ts`) diproteksi dengan package `server-only`. Tidak ada variabel berawalan `NEXT_PUBLIC_*` untuk data kredensial. |
| **Mass Assignment** | Request Payload Handling | Seluruh skema Zod dikonfigurasi dengan `.strict()`. Atribut tak terdaftar (seperti `role`, `id`, `isHacked`) langsung ditolak dengan `400 Bad Request`. |
| **CSRF** | Mutating Endpoints (POST, PUT, PATCH, DELETE) | Menggunakan header otentikasi kustom `Authorization: Bearer <token>`. Jika menggunakan cookie ambient, middleware memvalidasi kesesuaian header `Origin` dan `Host`. |
| **API Abuse / DoS** | Global Endpoints | Rate Limiting in-memory dengan sliding window (15 req/menit untuk auth login/register, 120 req/menit untuk API lainnya). |

---

## 🚀 Perintah Dasar

```bash
# Menjalankan server development
pnpm dev

# Menjalankan migrasi database ke Neon
pnpm db:migrate

# Membuat file migrasi baru dari schema.ts
pnpm db:generate

# Mengisi data awal (Seeding: Admin, User, dan 12 Kategori Default)
pnpm db:seed

# Membuka Web GUI Drizzle Studio untuk eksplorasi database
pnpm db:studio

# Kompilasi build production
pnpm build
```

---

## 🔐 Akun Bawaan (Default Seeding)

- **Admin**: `admin@lianata.com` | Password: `password123`
- **User**: `user@lianata.com` | Password: `password123`

---

## 📋 Dokumentasi Endpoint API

Semua endpoint yang membutuhkan autentikasi harus menyertakan header:
`Authorization: Bearer <accessToken>`

---

### 1. Autentikasi (`/api/auth`)

#### POST `/api/auth/register`
Mendaftarkan akun user baru (Role default: `user`).

- **Header**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Aprilian Ananta",
  "email": "aprilian@example.com",
  "password": "Password123"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Registrasi berhasil",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Aprilian Ananta",
      "email": "aprilian@example.com",
      "role": "user",
      "avatarUrl": null,
      "createdAt": "2026-09-29T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbG...",
      "refreshToken": "4a7f...",
      "tokenType": "Bearer",
      "expiresIn": 3600
    }
  }
}
```

#### POST `/api/auth/login`
Autentikasi akun dan menerbitkan pasangan token baru.

- **Header**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "user@lianata.com",
  "password": "password123"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Aprilian User",
      "email": "user@lianata.com",
      "role": "user",
      "avatarUrl": null
    },
    "tokens": {
      "accessToken": "eyJhbG...",
      "refreshToken": "4a7f...",
      "tokenType": "Bearer",
      "expiresIn": 3600
    }
  }
}
```

#### POST `/api/auth/refresh`
Memperbarui access token dengan mekanisme *Token Rotation*. Token lama akan dicabut dan digantikan dengan token baru.

- **Header**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "refreshToken": "4a7f..."
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Token berhasil diperbarui",
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "new_random_hex...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

#### POST `/api/auth/logout`
Mencabut sesi aktif pengguna.

- **Header**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Request Body** (Opsional untuk mencabut sesi perangkat tertentu):
```json
{
  "refreshToken": "4a7f..."
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logout berhasil. Sesi telah dinonaktifkan."
}
```

#### GET `/api/auth/me`
Mengambil data profil pengguna yang sedang login.

- **Header**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Aprilian User",
      "email": "user@lianata.com",
      "role": "user",
      "avatarUrl": null
    }
  }
}
```

---

### 2. Transaksi (`/api/transactions`)

Pengelolaan uang masuk (`income`) dan uang keluar (`expense`) tanpa terikat pembukuan saldo akun yang kaku.

#### GET `/api/transactions`
Mengambil daftar riwayat transaksi pengguna dengan filter dan paginasi.

- **Header**: `Authorization: Bearer <accessToken>`
- **Query Parameter** (Opsional):
  - `type`: `income` | `expense`
  - `categoryId`: UUID kategori
  - `startDate`: Format ISO (misal: `2026-09-01T00:00:00Z`)
  - `endDate`: Format ISO (misal: `2026-09-30T23:59:59Z`)
  - `search`: Pencarian berdasarkan deskripsi transaksi
  - `page`: Nomor halaman (default: `1`)
  - `limit`: Jumlah data per halaman (default: `20`, max: `100`)
  - `userId`: Khusus Admin untuk melihat transaksi milik user tertentu
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "expense",
      "amount": "25000.00",
      "description": "Beli kopi",
      "transactionDate": "2026-09-29T10:00:00.000Z",
      "source": "manual",
      "rawPrompt": null,
      "chatMessageId": null,
      "createdAt": "2026-09-29T10:00:00.000Z",
      "updatedAt": "2026-09-29T10:00:00.000Z",
      "category": {
        "id": "uuid",
        "name": "Makanan & Minuman",
        "type": "expense",
        "icon": "restaurant",
        "color": "#FF5722"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

#### POST `/api/transactions`
Mencatat transaksi baru secara manual (uang masuk atau uang keluar).

- **Header**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "type": "expense",
  "amount": 25000,
  "description": "Beli kopi arabika",
  "categoryId": "uuid-kategori-opsional",
  "transactionDate": "2026-09-29T10:00:00Z",
  "source": "manual",
  "rawPrompt": null
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Transaksi berhasil dicatat.",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "categoryId": "uuid",
    "type": "expense",
    "amount": "25000.00",
    "description": "Beli kopi arabika",
    "transactionDate": "2026-09-29T10:00:00.000Z",
    "source": "manual",
    "chatMessageId": null,
    "rawPrompt": null,
    "createdAt": "2026-09-29T10:00:00.000Z",
    "updatedAt": "2026-09-29T10:00:00.000Z"
  }
}
```

#### GET `/api/transactions/{id}`
Mendapatkan detail satu transaksi berdasarkan ID.

- **Header**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "type": "expense",
    "amount": "25000.00",
    "description": "Beli kopi",
    "transactionDate": "2026-09-29T10:00:00.000Z",
    "source": "manual",
    "category": {
      "id": "uuid",
      "name": "Makanan & Minuman",
      "type": "expense",
      "icon": "restaurant",
      "color": "#FF5722"
    }
  }
}
```

#### PATCH `/api/transactions/{id}`
Memperbarui data transaksi.

- **Header**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Request Body** (Semua field opsional):
```json
{
  "amount": 28000,
  "description": "Beli kopi arabika + gula aren",
  "type": "expense",
  "categoryId": "uuid-kategori-baru"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Transaksi berhasil diperbarui.",
  "data": {
    "id": "uuid",
    "amount": "28000.00",
    "description": "Beli kopi arabika + gula aren"
  }
}
```

#### DELETE `/api/transactions/{id}`
Menghapus data transaksi.

- **Header**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Transaksi berhasil dihapus."
}
```

#### GET `/api/transactions/summary`
Mendapatkan rekapitulasi data keuangan (total uang masuk, total uang keluar, dan selisih arus kas).

- **Header**: `Authorization: Bearer <accessToken>`
- **Query Parameter** (Opsional):
  - `startDate`: Format ISO
  - `endDate`: Format ISO
  - `userId`: Khusus Admin
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalIncome": 3500000,
    "totalExpense": 65000,
    "netBalance": 3435000,
    "incomeCount": 1,
    "expenseCount": 2,
    "totalCount": 3
  }
}
```

---

### 3. Chat & Integrasi AI Keuangan (`/api/chat`)

Fitur cerdas untuk mencatat transaksi cukup dengan mengetik kalimat natural bahasa Indonesia (seperti *"hari ini saya beli kopi 25k"* atau *"tadi saya baru nerima gaji 3,5jt"*). Model AI OpenRouter secara otomatis mengekstrak nominal, tipe transaksi (pemasukan/pengeluaran), deskripsi, mencocokkan kategori, dan langsung menyimpannya ke database.

#### POST `/api/chat`
Mengirim pesan ke asisten AI dan otomatis mencatat transaksi jika terdeteksi.

- **Header**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "sessionId": "uuid-sesi-opsional",
  "message": "hari ini saya beli kopi 25k"
}
```
*(Catatan: Jika `sessionId` tidak disertakan, sistem otomatis membuat sesi percakapan baru).*

- **Response (200 OK - Terdeteksi Transaksi)**:
```json
{
  "success": true,
  "data": {
    "sessionId": "b47c0a6b-c725-4c6e-b3f4-1d528b99e034",
    "userMessage": {
      "id": "e2646d5f-1498-4c1d-85e6-42d7211bfb91",
      "sessionId": "b47c0a6b-c725-4c6e-b3f4-1d528b99e034",
      "sender": "user",
      "content": "hari ini saya beli kopi 25k",
      "status": "processed",
      "createdAt": "2026-09-29T12:28:40.000Z"
    },
    "assistantMessage": {
      "id": "4a718d78-5e8c-4f73-958f-287707e71f49",
      "sessionId": "b47c0a6b-c725-4c6e-b3f4-1d528b99e034",
      "sender": "assistant",
      "content": "Halo, transaksi beli kopi sebesar Rp25.000 telah dicatat dengan sukses!",
      "status": "none",
      "createdAt": "2026-09-29T12:28:41.000Z"
    },
    "transaction": {
      "id": "38828c14-bc3a-481b-9da9-5eac8f7aac56",
      "userId": "4b271178-1f53-41e6-8509-f688bb619b57",
      "categoryId": "8ce199ea-4d8e-4a6c-94cf-137b772c9120",
      "type": "expense",
      "amount": "25000.00",
      "description": "Beli kopi",
      "transactionDate": "2026-09-29T12:28:41.000Z",
      "source": "ai_chat",
      "rawPrompt": "hari ini saya beli kopi 25k"
    }
  }
}
```

- **Response (200 OK - Pesan Biasa Tanpa Transaksi)**:
```json
{
  "success": true,
  "data": {
    "sessionId": "b47c0a6b-c725-4c6e-b3f4-1d528b99e034",
    "userMessage": {
      "id": "uuid",
      "sender": "user",
      "content": "Halo, apa fitur aplikasi ini?",
      "status": "none"
    },
    "assistantMessage": {
      "id": "uuid",
      "sender": "assistant",
      "content": "Halo! Aplikasi ini adalah pencatat keuangan yang membantu Anda mencatat pemasukan dan pengeluaran...",
      "status": "none"
    },
    "transaction": null
  }
}
```

#### GET `/api/chat/sessions`
Mengambil riwayat daftar sesi percakapan chat milik user.

- **Header**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "b47c0a6b-c725-4c6e-b3f4-1d528b99e034",
      "userId": "uuid",
      "title": "hari ini saya beli kopi 25k...",
      "messageCount": 4,
      "createdAt": "2026-09-29T12:28:40.000Z",
      "updatedAt": "2026-09-29T12:28:42.000Z"
    }
  ]
}
```

#### POST `/api/chat/sessions`
Membuat sesi percakapan baru dengan judul kustom.

- **Header**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "title": "Keuangan Liburan Akhir Pekan"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Sesi percakapan berhasil dibuat.",
  "data": {
    "id": "uuid",
    "title": "Keuangan Liburan Akhir Pekan",
    "createdAt": "2026-09-29T12:30:00.000Z"
  }
}
```

#### GET `/api/chat/sessions/{id}`
Mengambil riwayat seluruh pesan yang ada pada satu sesi percakapan tertentu.

- **Header**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "title": "Catatan Keuangan"
    },
    "messages": [
      {
        "id": "uuid-1",
        "sender": "user",
        "content": "hari ini saya beli kopi 25k",
        "parsedData": {
          "isTransaction": true,
          "type": "expense",
          "amount": 25000,
          "category": "Makanan & Minuman"
        },
        "status": "processed",
        "createdAt": "2026-09-29T12:28:40.000Z"
      },
      {
        "id": "uuid-2",
        "sender": "assistant",
        "content": "Halo, transaksi beli kopi sebesar Rp25.000 telah dicatat dengan sukses!",
        "status": "none",
        "createdAt": "2026-09-29T12:28:41.000Z"
      }
    ]
  }
}
```

#### DELETE `/api/chat/sessions/{id}`
Menghapus satu sesi percakapan beserta seluruh pesan di dalamnya.

- **Header**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Sesi percakapan berhasil dihapus."
}
```

---

### 4. Kategori (`/api/categories`)

#### GET `/api/categories`
Mengambil daftar kategori yang tersedia (kategori bawaan sistem + kategori kustom buatan user).

- **Header**: `Authorization: Bearer <accessToken>`
- **Query Parameter** (Opsional):
  - `type`: `income` | `expense`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": null,
      "name": "Makanan & Minuman",
      "type": "expense",
      "icon": "restaurant",
      "color": "#FF5722",
      "createdAt": "2026-09-29T10:00:00.000Z"
    }
  ]
}
```

#### POST `/api/categories`
Membuat kategori baru (jika user biasa yang membuat, kategori hanya dapat diakses oleh user tersebut).

- **Header**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "name": "Freelance",
  "type": "income",
  "icon": "laptop_mac",
  "color": "#2196F3"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Kategori berhasil dibuat.",
  "data": {
    "id": "uuid",
    "name": "Freelance",
    "type": "income",
    "icon": "laptop_mac",
    "color": "#2196F3"
  }
}
```

---

### 5. Admin (`/api/admin`)

#### GET `/api/admin/users`
Khusus Role `admin`. Mengambil seluruh daftar pengguna aplikasi.

- **Header**: `Authorization: Bearer <accessToken>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "total": 2,
    "users": [
      {
        "id": "uuid",
        "name": "Admin Lianata",
        "email": "admin@lianata.com",
        "role": "admin",
        "avatarUrl": null,
        "isActive": true,
        "createdAt": "2026-09-29T10:00:00.000Z"
      }
    ]
  }
}
```
