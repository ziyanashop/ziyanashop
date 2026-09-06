# Google Sheets connection

1. Create a Google Sheet for the store.
2. Create the sheets listed in `Code.gs` or let the script create them automatically.
3. Open **Extensions > Apps Script**, paste `Code.gs`, and save.
4. In Apps Script, open **Project Settings > Script properties** and add:
   - Property: `API_TOKEN`
   - Value: a long random string
5. Deploy > New deployment > Web app.
6. Execute as: **Me**.
7. Who has access: **Anyone**.
8. Copy the Web app URL. Do not put the Script property value in this repository.
9. Create a local `.env` file from `.env.example` and set `VITE_API_URL` and `VITE_API_TOKEN`.
10. Restart Vite after changing `.env`.

The frontend sends complete JSON collections for settings, products, orders, coupons, campaigns, and expenses. The sheet tabs act as a simple durable database. For production, replace the shared token with server-side authentication because a Vite token is visible in browser code.
