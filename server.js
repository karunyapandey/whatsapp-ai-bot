require("dotenv").config()

const express = require("express")
const twilio = require("twilio")
const Groq = require("groq-sdk")

const app = express()

app.use(express.urlencoded({ extended: false }))

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

// Test route
app.get("/", (req, res) => {
  res.send("WhatsApp AI Bot Running")
})

// Webhook for WhatsApp messages
app.post("/webhook", async (req, res) => {

  const userMessage = req.body.Body
  const sender = req.body.From

  console.log("From:", sender)
  console.log("Message:", userMessage)

  // Ignore messages that do not start with "!"
  if (!userMessage.startsWith("!")) {
    return res.sendStatus(200)
  }

  // Remove "!" from message
  const question = userMessage.slice(1).trim()

  if (!question) {
    const twiml = new twilio.twiml.MessagingResponse()
    twiml.message("⚠️ Please type a question after !")

    res.writeHead(200, { "Content-Type": "text/xml" })
    return res.end(twiml.toString())
  }

  try {

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant replying on WhatsApp." },
        { role: "user", content: question }
      ],
      model: "llama-3.1-8b-instant"
    })

    const aiReply = completion.choices[0].message.content

    console.log("AI:", aiReply)

    const twiml = new twilio.twiml.MessagingResponse()
    twiml.message(aiReply)

    res.writeHead(200, { "Content-Type": "text/xml" })
    res.end(twiml.toString())

  } catch (error) {

    console.error("Groq Error:", error)

    const twiml = new twilio.twiml.MessagingResponse()
    twiml.message("⚠️ AI temporarily unavailable. Try again later.")

    res.writeHead(200, { "Content-Type": "text/xml" })
    res.end(twiml.toString())
  }

})

// Start server
app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT)
})