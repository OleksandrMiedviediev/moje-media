# 💧 Moje Media

Aplikacja do domowych rozliczeń mediów: woda, ścieki i opłaty stałe. Rejestracja z potwierdzeniem e-mail, prywatne dane każdego użytkownika, historia z wykresem i celem zużycia, płatność kodem QR (polski standard ZBP).

**Stack:** React 19 · Vite · Express 5 · MongoDB · Brevo (e-mail)

---

## ✨ Funkcje

### 🔐 Konto użytkownika

- rejestracja e-mail + hasło z potwierdzeniem adresu (link na mail);
- logowanie, reset hasła przez e-mail;
- onboarding: adres, powierzchnia, liczba mieszkańców — przy pierwszym logowaniu;
- wszystkie dane prywatne — każdy widzi tylko swoje mieszkanie.

### 📊 Bieżące rozliczenie

- wpisujesz tylko **aktualne wskazanie wody** — zużycie i suma liczą się automatycznie;
- rozbicie: zimna woda, ścieki, śmieci, konserwacja, administracja, sprzątanie, światło klatki, fundusz remontowy;
- taryfy z datą obowiązywania — zmiana stawek nie rusza starych miesięcy;
- po zapisie suma pozostaje widoczna (nie przelicza się z pustego pola);
- **dodatkowe liczniki** (ciepła woda, gaz, prąd) i stałe opłaty (internet, TV) — dodaj w Ustawieniach;
- **nowy licznik** — potwierdź wymianę, gdy wskazanie mniejsze niż poprzednie.

### 📈 Historia

- lista miesięcy z filtrami po roku i paginacją (5/10/20/50 na stronę);
- wykres zużycia z przewijaniem poziomym: miesiące, suma roczna, **koszty po kategoriach** (stek), **rok do roku**;
- pod każdym słupkiem kwota do zapłaty;
- **cel zużycia** (m³/os./mies.) — słupki powyżej celu podświetlone na czerwono;
- rozwinięcie miesiąca: wskazania licznika + pełne rozbicie kosztów;
- edycja, usunięcie, płatność dowolnego miesiąca;
- **eksport CSV** — pobierz historię do Excel.

### 💳 Płatność QR

- kod QR w polskim standardzie **ZBP** — skanujesz w aplikacji banku (PKO, mBank, ING, Santander, Erste PL…);
- automatycznie wypełnia: numer konta, NIP odbiorcy, kwotę, tytuł przelewu;
- przycisk „Zapłać” przy bieżącym miesiącu i przy każdym miesiącu w historii.

### 🏠 Wiele mieszkań

- dodaj kolejne adresy w Ustawieniach → Mieszkania;
- przełącznik w nagłówku — każde mieszkanie ma osobną historię, taryfy i ustawienia;
- usuwanie z potwierdzeniem.

### 🔔 Powiadomienia push

- przypomnienia: wpisz wskazania / do zapłaty;
- wybierz dzień miesiąca i godzinę;
- działa po „zainstalowaniu” PWA na telefonie.

### 🌙 Motyw ciemny

- przełącznik w Ustawieniach → Mieszkania;
- zapisuje wybór lokalnie.

### 💾 Zapamiętywanie

- aktywna zakładka, filtry i rozmiar strony zachowują się po odświeżeniu;
- fallback lokalny (localStorage), gdy API niedostępne.

---

## 🚀 Szybki start (lokalnie)

```bash
# 1. Klon i instalacja
git clone https://github.com/OleksandrMiedviediev/moje-media.git
cd moje-media
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Zmienne środowiskowe backendu
cp backend/.env.example backend/.env
# uzupełnij MONGODB_URI, JWT_SECRET, BREVO_API_KEY (patrz niżej)

# 3. Start — API (10000) + frontend (5173) jednocześnie
npm run dev
```

Otwórz http://localhost:5173 → zarejestruj się → potwierdź e-mail → podaj dane mieszkania.

---

## ☁️ Deploy

### Backend → Render

1. **New → Web Service** → repo `moje-media`, Root Directory: `backend`
2. Build: `npm install` · Start: `npm start`
3. Environment Variables:

| Key             | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| `MONGODB_URI`   | `mongodb+srv://user:pass@cluster.mongodb.net/media-billing`              |
| `FRONTEND_URL`  | `https://twoja-apka.vercel.app`                                          |
| `JWT_SECRET`    | losowy ciąg (`openssl rand -hex 32`)                                     |
| `BREVO_API_KEY` | `xkeysib-...` z [app.brevo.com](https://app.brevo.com/settings/keys/api) |
| `SMTP_FROM`         | `Moje Media <twoj@gmail.com>`                                            |
| `VAPID_PUBLIC_KEY`  | `BBJh...` (dla push)                                                     |
| `VAPID_PRIVATE_KEY` | `kbj8...` (dla push)                                                     |

4. Deploy → skopiuj URL (np. `https://moje-media.onrender.com`)

### Frontend → Vercel

1. Import repo → Root Directory: `frontend`
2. Build: `npm run build` · Output: `dist`
3. Environment Variable: `VITE_API_URL` = URL z Render
4. Deploy → Redeploy backendu po zmianie `FRONTEND_URL`

---

## 🗄️ MongoDB Atlas

1. [cloud.mongodb.com](https://cloud.mongodb.com) → **M0 Free** cluster
2. **Database Access** → użytkownik z `readWriteAnyDatabase`
3. **Network Access** → `0.0.0.0/0` (dla Render)
4. Connect → Drivers → skopiuj connection string do `MONGODB_URI`

Kolekcje (`users`, `entries`, `tariffs`, `settings`) tworzą się automatycznie.

---

## 📧 E-mail (Brevo)

Render free blokuje porty SMTP — używamy **Brevo HTTP API**:

1. [app.brevo.com](https://app.brevo.com) → **SMTP & API → API Keys** → Generate
2. Skopiuj `xkeysib-...` do `BREVO_API_KEY` na Render
3. Dodaj sender w **Senders** (e-mail musi być potwierdzony)

Bez klucza aplikacja działa, ale linki potwierdzające wypisuje tylko w logach serwera.

---

## 🗂️ Struktura

```
moje-media/
├── backend/
│   ├── src/server.js       # Express API: auth, entries, tariffs, settings
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx        # punkt wejścia
│   │   ├── App.jsx         # stan globalny, zakładki
│   │   ├── constants.js    # domyślne ustawienia/taryfy
│   │   ├── utils.js        # calc, money, epc/zbp QR
│   │   ├── api.js          # axios + token
│   │   └── components/
│   │       ├── Auth.jsx        # logowanie/rejestracja/reset
│   │       ├── HomeTab.jsx     # bieżące rozliczenie + QR
│   │   │   ├── HistoryTab.jsx  # historia, wykres, filtry, CSV
│   │   │   ├── SettingsTab.jsx # mieszkania, taryfy, płatność, motyw
│   │   │   └── NotificationsSection.jsx # powiadomienia push
│   ├── public/favicon.svg
│   └── vite.config.js        # PWA + proxy
└── package.json            # npm run dev — oba serwisy naraz
```

---

## 🔑 API (skrót)

| Endpoint                             | Opis                        |
| ------------------------------------ | --------------------------- |
| `POST /api/auth/register`            | rejestracja + wysyłka linku |
| `GET /api/auth/verify?token=`        | potwierdzenie e-mail        |
| `POST /api/auth/login`               | logowanie → JWT             |
| `POST /api/auth/forgot-password`     | link do resetu              |
| `POST /api/auth/reset-password`      | nowe hasło                  |
| `POST /api/auth/onboarding`          | dane mieszkania             |
| `GET/PUT /api/settings`              | ustawienia (auth)           |
| `GET/PUT /api/tariffs`               | taryfy (auth)               |
| `GET/PUT/DELETE /api/entries/:month` | wpisy (auth)                |
| `GET /api/health`                    | status + DB                 |

Wszystkie dane filtrowane po `userId` z JWT.

---

## 📝 Licencja

Prywatny projekt domowy.
