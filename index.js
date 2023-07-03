import express from 'express';
import { createClient } from 'redis';
import 'dotenv/config';

const app = express();

const client = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
});

async function testRaceConditionWithNX() {
  await Promise.all([await client.set('test1', "value1"), await client.setNX('test1', 'value2')])
    .then(() => console.log('test1 set successfully'));
}

async function testRaceConditionWithoutNX() {
  await Promise.all([
    await client.set('test2', "value1"),
    async () => {
      const test2 = await client.get('test2');
      if (!test2) {
        client.set('test2', 'value2');
        resolve('test2 set successfully');
      }
    }
  ]).then(() => console.log('test2 set successfully'));
}

client.on('error', err => console.log('Redis Client Error', err));

app.get('/', async (req, res) => {
  client.connect();
  await client.set('key', 'value');
  const value = await client.get('key');
  client.quit();
  res.json({value});
})

app.get("/test", async (req, res) => {
  client.connect();
  await testRaceConditionWithNX();
  await testRaceConditionWithoutNX();
  const test1 = await client.get('test1');
  const test2 = await client.get('test2');
  client.quit();
  res.json({test1, test2});
})

app.listen(3000, () => {
  console.log('Server listening on port: ', 3000);
});