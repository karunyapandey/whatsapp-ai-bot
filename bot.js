require("dotenv").config()

const { Client, LocalAuth } = require("whatsapp-web.js")
const Groq = require("groq-sdk")
const axios = require("axios")
const cheerio = require("cheerio")
const qrcode = require("qrcode")

// GROQ AI
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  }
})


// QR CODE (LINK VERSION FOR RAILWAY LOGS)
client.on("qr", async (qr) => {
  console.log("\n⚡ Scan this QR to login\n")

  const qrImage = await qrcode.toDataURL(qr)

  console.log(qrImage)
  console.log("\nOpen the above link in browser and scan.\n")
})


// READY
client.on("ready", () => {
  console.log("✅ WhatsApp AI Bot is Ready!")
})


// MESSAGE HANDLER
client