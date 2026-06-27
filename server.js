const express = require('express');
const { PinTanClient } = require('fints');
const app = express();

app.use(express.json());

// Dein Cyberpunk-Willkommens-Screen im Browser
app.get('/', (req, res) => {
  res.send({ status: "ONLINE", system: "CYBERPUNK_FINANCE_MAINFRAME_v1.0" });
});

// Der geheime Tunnel für deine App
app.post('/api/fetch-transactions', async (req, res) => {
  const { loginId, pin } = req.body;

  if (!loginId || !pin) {
    return res.status(400).json({ error: "ACCESS_DENIED: Credentials missing." });
  }

  try {
    // Verbindung zur Ostsächsischen Sparkasse via FinTS 3.0
    const client = new PinTanClient({
      url: 'https://fints.sparkasse-banking.de/fints30',
      blz: '85050300',
      name: loginId,
      pin: pin,
    });

    const accounts = await client.getAccounts();
    if (accounts.length === 0) {
      return res.status(404).json({ error: "NO_ACCOUNTS_FOUND" });
    }

    const mainAccount = accounts[0];

    // Letzte 30 Tage abrufen
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    const statements = await client.getStatements(mainAccount, startDate, endDate);

    // Daten für dein Cyberpunk-UI säubern
    const formattedTransactions = statements.map(t => ({
      amount: t.amount,
      purpose: t.remittanceInformationUnstructured || "Kein Verwendungszweck",
      date: t.bookingDate,
      partner: t.name
    }));

    res.json({ success: true, data: formattedTransactions });

  } catch (error) {
    // 2FA / TAN-Abfrage der Sparkasse abfangen
    if (error.challenge) {
      return res.json({
        success: false,
        tanRequired: true,
        challengeText: error.challenge,
        tanSegment: error.segment
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Server starten
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Dein Mainframe läuft auf Port " + listener.address().port);
});
