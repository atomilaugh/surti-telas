import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();

  // Clean Carlos if exists
  await p.user.deleteMany({ where: { email: 'cliente.prueba.nuevo@ejemplo.com' } });
  await p.customer.deleteMany({ where: { email: 'cliente.prueba.nuevo@ejemplo.com' } });

  // Register Carlos via API
  const registerRes = await fetch('http://localhost:3000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Carlos',
      apellidos: 'Prueba Cliente',
      email: 'cliente.prueba.nuevo@ejemplo.com',
      password: 'Password123!',
      role: 'CLIENTE',
      telefono: '3001234567',
      direccion: 'Carrera 50 # 20-30',
      ciudad: 'Medellin',
      tipoDocumento: 'CC',
      numeroDocumento: '999999991',
    }),
  });
  const registerData = await registerRes.json();
  console.log('REGISTER:', JSON.stringify(registerData, null, 2));

  // Login Carlos
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cliente.prueba.nuevo@ejemplo.com',
      password: 'Password123!',
    }),
  });
  const loginData = await loginRes.json();
  console.log('LOGIN:', JSON.stringify(loginData, null, 2));

  // Get Carlos from DB
  const user = await p.user.findUnique({ where: { email: 'cliente.prueba.nuevo@ejemplo.com' }, select: { id: true, nombre: true, apellidos: true, email: true, telefono: true, direccion: true, tipoDocumento: true, numeroDocumento: true, role: true } });
  const customer = await p.customer.findFirst({ where: { email: 'cliente.prueba.nuevo@ejemplo.com' }, select: { id: true, nombre: true, apellidos: true, email: true, ciudad: true, telefono: true, direccion: true, nit: true, estado: true, cupoTotal: true, cupoUsado: true, isTrustedCustomer: true } });
  console.log('USER DB:', JSON.stringify(user, null, 2));
  console.log('CUSTOMER DB:', JSON.stringify(customer, null, 2));

  // GET /customers
  const customersRes = await fetch('http://localhost:3000/api/v1/customers');
  const customersData = await customersRes.json();
  const carlosInList = customersData.items?.find((c: any) => c.email === 'cliente.prueba.nuevo@ejemplo.com');
  console.log('GET /customers Carlos:', JSON.stringify(carlosInList, null, 2));

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
