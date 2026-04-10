require("dotenv").config()

const express = require("express")
const { Client, LocalAuth } = require("whatsapp-web.js")
const qrcode = require("qrcode-terminal")
const qrcodeData = require("qrcode")
const Groq = require("groq-sdk")
const axios = require("axios")
const cheerio = require("cheerio")

const app = express()
let qrImageUrl = null

const baseUrl = process.env.RAILWAY_SERVICE_URL || process.env.RAILWAY_STATIC_URL || process.env.APP_URL || process.env.HOST || null

// Initialize Groq AI
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

const puppeteerOptions = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ]
}

if (process.platform === "linux") {
  puppeteerOptions.executablePath = "/usr/bin/chromium"
}

// Create WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: puppeteerOptions
});

// Show QR code first time

client.on("qr", async (qr) => {
  console.log("QR received. You can scan it from the app's /qr page or your terminal.");
  qrcode.generate(qr, { small: true })

  qrImageUrl = await qrcodeData.toDataURL(qr)
  console.log("QR page available at /qr once the app is up")
})

app.get("/qr", (req, res) => {
  if (!qrImageUrl) {
    return res.send("QR code not generated yet. Please wait for the bot to start.")
  }

  res.send(`
    <html>
      <body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#111;color:#fff;">
        <div style="text-align:center;">
          <h2>WhatsApp Web QR Code</h2>
          <img src="${qrImageUrl}" alt="WhatsApp QR Code" />
          <p>Scan this with WhatsApp on your phone.</p>
        </div>
      </body>
    </html>
  `)
})

const port = process.env.PORT || 3000
const qrPath = "/qr"
const scanUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}${qrPath}` : `http://localhost:${port}${qrPath}`

app.listen(port, () => {
  console.log("QR server running on port " + port)
  console.log("Scan QR at: " + scanUrl)
  if (!baseUrl) {
    console.log("If deployed, open your application URL in a browser and append /qr")
  }
})

// When bot is ready
client.on("ready", () => {
  console.log("✅ WhatsApp AI Bot is Ready!")
})

// Listen for messages
client.on("message", async (message) => {

  const text = message.body

  console.log("Message received:", text)

  if (!text.startsWith("!")) return

  const args = text.split(" ")
  const command = args[0].toLowerCase()

  // ---------------- AI CHAT ----------------

  if (command === "!ai") {

    const question = args.slice(1).join(" ")

    if (!question) {
      return message.reply("Please ask a question.\nExample:\n!ai What is blockchain?")
    }

    try {

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant replying on WhatsApp."
          },
          {
            role: "user",
            content: question
          }
        ],
        model: "llama-3.1-8b-instant"
      })

      const reply = completion.choices[0].message.content

      message.reply(reply)

    } catch (error) {

      console.error(error)

      message.reply("⚠️ AI error. Try again later.")

    }
  }

  // ---------------- LINK SUMMARIZER ----------------

  if (command === "!summarize") {

    const url = args[1]

    if (!url) {
      return message.reply(
        "Please provide a link.\nExample:\n!summarize https://example.com"
      )
    }

    try {

      const response = await axios.get(url)

      const $ = cheerio.load(response.data)

      let articleText = ""

      $("p").each((i, el) => {
        articleText += $(el).text() + " "
      })

      articleText = articleText.slice(0, 3000)

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `Summarize this article in 5 bullet points:\n\n${articleText}`
          }
        ],
        model: "llama-3.1-8b-instant"
      })

      const summary = completion.choices[0].message.content

      message.reply("📄 Article Summary:\n\n" + summary)

    } catch (error) {

      console.error(error)

      message.reply("❌ Could not summarize this link.")

    }
  }

  // ---------------- PHISHING DETECTOR ----------------

  if (command === "!check") {

    const url = args[1]

    if (!url) {
      return message.reply(
        "Please provide a link.\nExample:\n!check https://example.com"
      )
    }

    try {

      let riskScore = 0

      if (url.includes("@")) riskScore += 40
      if (url.includes("-login")) riskScore += 20
      if (url.includes("verify")) riskScore += 20
      if (url.length > 75) riskScore += 20

      let result = ""

      if (riskScore >= 60) {
        result = "⚠️ High phishing risk"
      } else if (riskScore >= 30) {
        result = "⚠️ Suspicious link"
      } else {
        result = "✅ Likely safe"
      }

      message.reply(
        `🔍 Link Analysis\n\nURL: ${url}\nRisk Score: ${riskScore}/100\nResult: ${result}`
      )

    } catch (error) {

      console.error(error)

      message.reply("❌ Could not analyze this link.")

    }
  }

})

// Start bot
client.initialize()