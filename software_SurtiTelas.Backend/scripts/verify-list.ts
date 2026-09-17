import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();

  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtdTR1aDE3dTAwMDBpZ3hjdjN1ZWg1bm4iLCJlbWFpbCI6ImNsaWVudGUucHJ1ZWJhLm51ZXZvQGVqZW1wbG8uY29tIiwibm9tYnJlIjoiQ2FybG9zIiwicm9sZSI6IkNMSUVOVEUiLCJwZXJtaXNzaW9ucyI6WyJjYXRhbG9nOnJlYWQiLCJvcmRlcnM6cmVhZCIsIm9yZGVyczpjcmVhdGUiLCJjdXN0b21lcnM6cmVhZCIsIm5vdGlmaWNhdGlvbnM6cmVhZCJdLCJyb2xlQWN0aXZlIjp0cnVlLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzg5NjA4MTI4LCJleHAiOjE3ODk2MDkwMjh9.8wWkuhhBkZmU3qCUFue_Xf7DxZlXTBERwRd3JRmygSs';
  const res = await fetch('http://localhost:3000/api/v1/customers?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const raw = await res.json();
  console.log('Response keys:', Object.keys(raw));
  console.log('Has items:', !!raw.items);
  console.log('Total records:', raw.totalRecords);

  if (raw.items) {
    const carlos = raw.items.find((c: any) => c.email === 'cliente.prueba.nuevo@ejemplo.com');
    console.log('Carlos in customers:', JSON.stringify(carlos, null, 2));
  } else if (raw.data && raw.data.items) {
    const carlos = raw.data.items.find((c: any) => c.email === 'cliente.prueba.nuevo@ejemplo.com');
    console.log('Carlos in customers (data.items):', JSON.stringify(carlos, null, 2));
  } else {
    console.log('Full response:', JSON.stringify(raw, null, 2).substring(0, 3000));
  }

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
