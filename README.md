# Moje Media — React + Vercel + Render + MongoDB

Aplikacja do domowych rozliczeń mediów. Wersja nie zawiera QR ani płatności.

## Funkcje
- aktualne i poprzednie wskazanie zimnej wody;
- automatyczne zużycie m³;
- automatyczne rozliczenie wody, ścieków i opłat stałych;
- historia miesięcy;
- edycja/usuwanie miesiąca;
- metryki i wykres zużycia;
- taryfy z datą obowiązywania — zmiana od konkretnego miesiąca nie zmienia starych wpisów;
- dane mieszkania i liczba mieszkańców;
- zapis lokalny jako fallback oraz synchronizacja z MongoDB przez API.

## Backend / Render
1. Utwórz MongoDB Atlas i bazę.
2. Na Render utwórz **Web Service** wskazujący folder `backend`.
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Environment Variables:
   - `MONGODB_URI` — connection string Atlas
   - `FRONTEND_URL` — URL aplikacji Vercel, np. `https://moje-media.vercel.app`
   - `PORT` — Render ustawi automatycznie; można zostawić.

## Frontend / Vercel
1. Importuj repo do Vercel.
2. Root Directory: `frontend`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variable:
   - `VITE_API_URL=https://TWOJ-BACKEND.onrender.com`

Po zmianie `FRONTEND_URL` na Vercel URL zrób redeploy backendu.

## Ważne
Jeżeli backend jest niedostępny, aplikacja nadal działa lokalnie w przeglądarce. Po przywróceniu API dane lokalne nie są automatycznie scalane z bazą — dlatego przed pierwszym wdrożeniem najlepiej zacząć od pustej aplikacji i używać jednego urządzenia.
