const amqp = require('amqplib');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

let productionTime = 900000; // default production time in milliseconds (15 minutes)

// RabbitMQ setup
const rabbitMqUrl = 'amqp://host.docker.internal';
const carQueue = 'car_requests';
const partQueue = 'part_requests';
const productionQueue = 'production_finished';

async function connectRabbitMQ() {
  const conn = await amqp.connect(rabbitMqUrl);
  const channel = await conn.createChannel();

  await channel.assertQueue(carQueue, { durable: true });
  await channel.assertQueue(partQueue, { durable: true });
  await channel.assertQueue(productionQueue, { durable: true });

  channel.consume(carQueue, async (msg) => {
    if (msg !== null) {
      const carDetails = JSON.parse(msg.content.toString());
      console.log(`Received request to produce car: ${carDetails.uuid}`);

      // Simulate car production
      setTimeout(async () => {
        console.log(`Car produced: ${carDetails.uuid}`);
        await channel.sendToQueue(productionQueue, Buffer.from(JSON.stringify(carDetails)));
      }, productionTime);

      channel.ack(msg);
    }
  });

  return channel;
}

// HTTP endpoint to adjust production time
app.post('/setProductionTime', (req, res) => {
  const { time } = req.body;
  if (time && Number.isInteger(time)) {
    productionTime = time * 60000; // convert minutes to milliseconds
    res.send(`Production time is now set to ${time} minutes.`);
  } else {
    res.status(400).send('Invalid time provided. Please provide a valid integer for minutes.');
  }
});

const server = app.listen(3000, () => {
  console.log('Server running on port 3000');
  connectRabbitMQ().then(() => {
    console.log('Connected to RabbitMQ and waiting for messages.');
  });
});
