/**
 * ABHI CABS — In-memory mock backend (USE_MOCK=true).
 */
import {
  BOOKING_STATUS, TRIP_STATUS, PAYMENT_STATUS, INVOICE_STATUS,
  DRIVER_STATUS, VEHICLE_STATUS, TICKET_STATUS,
} from '../constants';

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
export const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const cities = ['Bengaluru','Chennai','Hyderabad','Pune','Mumbai','Delhi','Kolkata','Ahmedabad'];
const firstNames = ['Arjun','Priya','Ravi','Sneha','Vikram','Anita','Karthik','Divya','Manoj','Neha','Suresh','Pooja'];
const lastNames  = ['Kumar','Sharma','Reddy','Iyer','Nair','Patel','Singh','Rao','Gupta','Menon'];
const name = () => `${pick(firstNames)} ${pick(lastNames)}`;

// ── Masters ────────────────────────────────────────────────────────────────
function seedMasters() {
  const cargoTypes = [
    { id: uid('CGO'), name: 'General',    description: 'Standard non-fragile goods',   active: true  },
    { id: uid('CGO'), name: 'Fragile',    description: 'Glassware, electronics, etc.', active: true  },
    { id: uid('CGO'), name: 'Perishable', description: 'Food, pharma, cold-chain',      active: true  },
    { id: uid('CGO'), name: 'Bulk',       description: 'Loose materials, aggregates',   active: true  },
    { id: uid('CGO'), name: 'Documents',  description: 'Envelopes and legal papers',    active: true  },
    { id: uid('CGO'), name: 'Hazardous',  description: 'Chemicals, flammables',         active: false },
  ];

  const vehicleRates = [
    {
      id: uid('VRC'), active: true,
      name: 'Swift Desire A/C Cab',
      bsCategory: 'BSVI 2024', seater: 4, acType: 'A/C', category: 'Sedan',
      local:      { hours: 8,  km: 80, packageRate: 2000, extraHourRate: 150, extraKmRate: 14 },
      outstation: { perKmRate: 14, minKmPerDay: 300, driverBhata: 500 },
    },
    {
      id: uid('VRC'), active: true,
      name: 'Ertiga A/C Cab 7 Seater',
      bsCategory: 'BSVI 2025', seater: 7, acType: 'A/C', category: 'MUV',
      local:      { hours: 8,  km: 80, packageRate: 2500, extraHourRate: 200, extraKmRate: 18 },
      outstation: { perKmRate: 18, minKmPerDay: 300, driverBhata: 500 },
    },
    {
      id: uid('VRC'), active: true,
      name: 'Innova A/C Cab 8 Seater',
      bsCategory: 'BSIV 2016', seater: 8, acType: 'A/C', category: 'MUV',
      local:      { hours: 8,  km: 80, packageRate: 2500, extraHourRate: 200, extraKmRate: 18 },
      outstation: { perKmRate: 18, minKmPerDay: 300, driverBhata: 500 },
    },
    {
      id: uid('VRC'), active: true,
      name: 'Crysta A/C Cab 8 Seater',
      bsCategory: 'BSVI 2024', seater: 8, acType: 'A/C', category: 'MUV Premium',
      local:      { hours: 8,  km: 80, packageRate: 3000, extraHourRate: 250, extraKmRate: 20 },
      outstation: { perKmRate: 20, minKmPerDay: 300, driverBhata: 500 },
    },
    {
      id: uid('VRC'), active: true,
      name: 'Hycross A/C Cab 8 Seater',
      bsCategory: 'BSVI 2026', seater: 8, acType: 'A/C', category: 'MUV Premium',
      local:      { hours: 8,  km: 80, packageRate: 3500, extraHourRate: 300, extraKmRate: 25 },
      outstation: { perKmRate: 25, minKmPerDay: 300, driverBhata: 500 },
    },
    {
      id: uid('VRC'), active: true,
      name: '12 Seater Tempo Traveler A/C Coach',
      bsCategory: 'BSVI 2023', seater: 12, acType: 'A/C', category: 'Tempo Traveler',
      local:      { hours: 12, km: 80, packageRate: 5000, extraHourRate: 250, extraKmRate: 27 },
      outstation: { perKmRate: 27, minKmPerDay: 300, driverBhata: 700 },
    },
    {
      id: uid('VRC'), active: true,
      name: '12 Seater 1x1 Urbania Premium Maharaja Luxury A/C Coach',
      bsCategory: 'BSVI 2026', seater: 12, acType: 'A/C', category: 'Luxury Coach',
      local:      { hours: 8,  km: 80, packageRate: 8000, extraHourRate: 400, extraKmRate: 40 },
      outstation: { perKmRate: 40, minKmPerDay: 300, driverBhata: 900 },
    },
    {
      id: uid('VRC'), active: true,
      name: '13 Seater Force Urbania A/C Coach',
      bsCategory: 'BSVI 2024', seater: 13, acType: 'A/C', category: 'Mini Coach',
      local:      { hours: 8,  km: 80, packageRate: 7000, extraHourRate: 300, extraKmRate: 35 },
      outstation: { perKmRate: 35, minKmPerDay: 300, driverBhata: 900 },
    },
    {
      id: uid('VRC'), active: true,
      name: '16 Seater Force Urbania A/C Coach',
      bsCategory: 'BSVI 2024', seater: 16, acType: 'A/C', category: 'Mini Coach',
      local:      { hours: 8,  km: 80, packageRate: 7500, extraHourRate: 350, extraKmRate: 40 },
      outstation: { perKmRate: 40, minKmPerDay: 300, driverBhata: 900 },
    },
    {
      id: uid('VRC'), active: true,
      name: '17 Seater Tempo Traveler A/C Coach',
      bsCategory: 'BSVI 2023', seater: 17, acType: 'A/C', category: 'Tempo Traveler',
      local:      { hours: 12, km: 80, packageRate: 6000, extraHourRate: 300, extraKmRate: 33 },
      outstation: { perKmRate: 33, minKmPerDay: 300, driverBhata: 700 },
    },
    {
      id: uid('VRC'), active: true,
      name: '22 Seater Bharat Benz Luxury A/C Coach',
      bsCategory: 'BSVI 2023', seater: 22, acType: 'A/C', category: 'Luxury Coach',
      local:      { hours: 12, km: 80, packageRate: 9000,  extraHourRate: 400, extraKmRate: 50 },
      outstation: { perKmRate: 50, minKmPerDay: 300, driverBhata: 1200 },
    },
    {
      id: uid('VRC'), active: true,
      name: '28 Seater Bharat Benz Luxury A/C Coach',
      bsCategory: 'BSVI 2023', seater: 28, acType: 'A/C', category: 'Luxury Coach',
      local:      { hours: 12, km: 80, packageRate: 9500,  extraHourRate: 500, extraKmRate: 55 },
      outstation: { perKmRate: 55, minKmPerDay: 300, driverBhata: 1200 },
    },
    {
      id: uid('VRC'), active: true,
      name: '33 Seater Bharat Benz Executive A/C Coach',
      bsCategory: 'BSVI 2022', seater: 33, acType: 'A/C', category: 'Executive Coach',
      local:      { hours: 12, km: 80, packageRate: 10000, extraHourRate: 500, extraKmRate: 58 },
      outstation: { perKmRate: 58, minKmPerDay: 300, driverBhata: 1200 },
    },
    {
      id: uid('VRC'), active: true,
      name: '40 Seater Ashok Leyland Executive A/C Coach',
      bsCategory: 'BSVI 2025', seater: 40, acType: 'A/C', category: 'Executive Coach',
      local:      { hours: 12, km: 80, packageRate: 11000, extraHourRate: 500, extraKmRate: 65 },
      outstation: { perKmRate: 65, minKmPerDay: 300, driverBhata: 1200 },
    },
    {
      id: uid('VRC'), active: true,
      name: '45 Seater Ashok Leyland Luxury A/C Coach',
      bsCategory: 'BSVI 2026', seater: 45, acType: 'A/C', category: 'Luxury Coach',
      local:      { hours: 12, km: 80, packageRate: 12000, extraHourRate: 500, extraKmRate: 70 },
      outstation: { perKmRate: 70, minKmPerDay: 300, driverBhata: 1200 },
    },
    {
      id: uid('VRC'), active: true,
      name: '49 Seater Ashok Leyland Executive A/C Coach',
      bsCategory: 'BSIV 2017', seater: 49, acType: 'A/C', category: 'Executive Coach',
      local:      { hours: 12, km: 80, packageRate: 10500, extraHourRate: 500, extraKmRate: 63 },
      outstation: { perKmRate: 63, minKmPerDay: 300, driverBhata: 1200 },
    },
    {
      id: uid('VRC'), active: true,
      name: '49 Seater Ashok Leyland Executive Non A/C Coach',
      bsCategory: 'BSVI 2025', seater: 49, acType: 'Non A/C', category: 'Executive Coach',
      local:      { hours: 12, km: 80, packageRate: 9000,  extraHourRate: 500, extraKmRate: 53 },
      outstation: { perKmRate: 53, minKmPerDay: 300, driverBhata: 1200 },
    },
  ];

  const vehicleTypes = vehicleRates.map(v => ({
    id: uid('VTP'), name: v.name, seater: v.seater, capacityTon: 0, active: v.active,
  }));

  const zones = [
    { id: uid('ZON'), name: 'Zone A — South Bengaluru', cities: ['Bengaluru','Chennai'],       active: true  },
    { id: uid('ZON'), name: 'Zone B — West Coast',      cities: ['Mumbai','Pune','Ahmedabad'], active: true  },
    { id: uid('ZON'), name: 'Zone C — Deccan',          cities: ['Hyderabad','Pune'],          active: true  },
    { id: uid('ZON'), name: 'Zone D — North',           cities: ['Delhi','Kolkata'],           active: false },
  ];

  const ratecards = [
    { id: uid('RTC'), name: 'Standard', baseRate: 12, perKmRate: 8,  active: true  },
    { id: uid('RTC'), name: 'Express',  baseRate: 20, perKmRate: 14, active: true  },
    { id: uid('RTC'), name: 'Economy',  baseRate: 8,  perKmRate: 5,  active: true  },
    { id: uid('RTC'), name: 'Bulk',     baseRate: 6,  perKmRate: 4,  active: false },
  ];

  return { cargoTypes, vehicleRates, vehicleTypes, zones, ratecards };
}

// ── Clients ────────────────────────────────────────────────────────────────
function seedClients(n = 38) {
  const companies = ['Raj Logistics','Sri Traders','Pacific Cargo','Bharat Movers','Sunrise Freight',
    'Metro Supplies','Kamath Industries','Reddy & Sons','Global Packers','AK Enterprises'];
  return Array.from({ length: n }, (_, i) => {
    const fullName = name();
    return {
      id: uid('CLT'), name: fullName,
      email: `${fullName.split(' ')[0].toLowerCase()}${i+1}@${pick(['gmail.com','yahoo.com','outlook.com','business.in'])}`,
      phone: `9${String(100000000 + rand(899999999)).slice(0, 9)}`,
      company: Math.random() > 0.35 ? pick(companies) : null,
      city: pick(cities),
      gst: Math.random() > 0.5 ? `29ABCDE${1000 + rand(9000)}F${rand(9)}Z${rand(9)}` : null,
      status: pick(['active','active','active','inactive']),
      totalBookings: rand(40) + 1,
      totalSpend: (rand(500) + 10) * 1000,
      createdAt: new Date(Date.now() - rand(400) * 86400000).toISOString(),
    };
  });
}

// ── Drivers ────────────────────────────────────────────────────────────────
function seedDrivers(n = 26) {
  return Array.from({ length: n }, () => ({
    id: uid('DRV'), name: name(),
    phone: `9${String(100000000 + rand(899999999)).slice(0, 9)}`,
    licenseNo: `KA${10 + rand(50)}${20200000 + rand(9999)}`,
    city: pick(cities),
    status: pick(Object.values(DRIVER_STATUS)),
    rating: (3.5 + Math.random() * 1.5).toFixed(1),
    documents: [
      { name: 'Driving License',    status: 'verified'                   },
      { name: 'Aadhaar Card',       status: pick(['verified','pending'])  },
      { name: 'Police Verification',status: pick(['verified','pending'])  },
    ],
    createdAt: new Date(Date.now() - rand(400) * 86400000).toISOString(),
  }));
}

// ── Vehicles ───────────────────────────────────────────────────────────────
function seedVehicles(n = 30) {
  const types = ['Mini Truck','Container','Pickup','Trailer','Tempo'];
  return Array.from({ length: n }, () => ({
    id: uid('VEH'),
    regNo: `KA${10 + rand(50)}${pick(['AB','CD','EF'])}${1000 + rand(8999)}`,
    type: pick(types),
    capacityTon: pick([1, 2, 3, 5, 7, 10]),
    status: pick(Object.values(VEHICLE_STATUS)),
    driverId: null,
    insuranceExpiry: new Date(Date.now() + rand(300) * 86400000).toISOString(),
    createdAt: new Date(Date.now() - rand(400) * 86400000).toISOString(),
  }));
}

// ── Bookings ───────────────────────────────────────────────────────────────
function seedBookings(n = 60) {
  const clientNames = Array.from({ length: 20 }, name);
  return Array.from({ length: n }, () => ({
    id: uid('BKG'),
    clientName: pick(clientNames),
    clientPhone: `9${String(100000000 + rand(899999999)).slice(0, 9)}`,
    pickup: `${pick(cities)}, Warehouse ${rand(20)}`,
    drop:   `${pick(cities)}, Sector ${rand(30)}`,
    cargoType: pick(['General','Fragile','Perishable','Bulk','Documents']),
    weightTon: pick([0.5, 1, 2, 3, 5]),
    fare: 800 + rand(9000),
    status: pick(Object.values(BOOKING_STATUS)),
    assignedDriverId: null, assignedVehicleId: null,
    assignedDriverName: null, assignedVehicleReg: null,
    notes: '',
    statusHistory: [],
    scheduledAt: new Date(Date.now() + rand(10) * 86400000).toISOString(),
    createdAt:   new Date(Date.now() - rand(60) * 86400000).toISOString(),
  }));
}

// ── Trips ──────────────────────────────────────────────────────────────────
function seedTrips(bookingsList, driversList, vehiclesList, n = 40) {
  return Array.from({ length: n }, () => {
    const booking = pick(bookingsList);
    const driver  = pick(driversList);
    const vehicle = pick(vehiclesList);
    return {
      id: uid('TRP'), bookingId: booking.id,
      driverId: driver.id, driverName: driver.name,
      vehicleId: vehicle.id, vehicleRegNo: vehicle.regNo,
      pickup: booking.pickup, drop: booking.drop,
      status: pick(Object.values(TRIP_STATUS)),
      startedAt: new Date(Date.now() - rand(5) * 86400000).toISOString(),
      timeline: [
        { label: 'Trip created',    at: new Date(Date.now() - rand(5) * 86400000).toISOString() },
        { label: 'Driver assigned', at: new Date(Date.now() - rand(4) * 86400000).toISOString() },
        { label: 'Pickup completed',at: new Date(Date.now() - rand(3) * 86400000).toISOString() },
      ],
    };
  });
}

// ── Payments ───────────────────────────────────────────────────────────────
function seedPayments(bookingsList, n = 50) {
  return Array.from({ length: n }, () => {
    const booking = pick(bookingsList);
    return {
      id: uid('PAY'), bookingId: booking.id, clientName: booking.clientName,
      amount: booking.fare,
      method: pick(['UPI','Card','Net Banking','Wallet','Cash']),
      status: pick(Object.values(PAYMENT_STATUS)),
      reference: `REF${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      notes: '',
      createdAt: new Date(Date.now() - rand(60) * 86400000).toISOString(),
    };
  });
}

// ── Invoices ───────────────────────────────────────────────────────────────
function seedInvoices(paymentsList, n = 40) {
  return Array.from({ length: n }, (_, i) => {
    const payment = pick(paymentsList);
    return {
      id: uid('INV'), invoiceNo: `INV-2026-${1000 + i}`,
      bookingId: payment.bookingId, clientName: payment.clientName,
      amount: payment.amount,
      tax:   Math.round(payment.amount * 0.18),
      total: Math.round(payment.amount * 1.18),
      status: pick(Object.values(INVOICE_STATUS)),
      issuedAt: new Date(Date.now() - rand(60) * 86400000).toISOString(),
      dueAt:    new Date(Date.now() + rand(20) * 86400000).toISOString(),
    };
  });
}

// ── Tickets ────────────────────────────────────────────────────────────────
// Fields match the customer-facing support form schema:
//   fullName (text, required), mobile (tel 10-digit, required),
//   email (email, optional), topic (dropdown, optional), message (textarea, required)
function seedTickets(n = 24) {
  const firstNames = ['Rahul','Priya','Amit','Sneha','Vikram','Ananya','Rohan','Meera','Karan','Divya','Suresh','Nisha','Arjun','Pooja','Rajesh'];
  const lastNames  = ['Sharma','Patel','Singh','Mehta','Kumar','Gupta','Joshi','Rao','Nair','Iyer'];
  const topics     = ['Booking Support','Payment Support','Cancellation Support','Corporate Enquiry','Other'];
  const sampleMessages = [
    'My driver has not arrived yet. The booking shows confirmed but no one came.',
    'I was charged extra for the trip. Please check and refund the difference.',
    'I need to cancel my booking. The cancellation option is not working.',
    'We are a company and want to set up a corporate account with monthly billing.',
    'The app keeps crashing when I try to book. Please fix this urgently.',
    'I did not receive my invoice after the trip was completed.',
    'Driver was very rude during the trip. Please take action.',
    'My payment was deducted twice for the same booking.',
  ];
  const subjectMap = {
    'Booking Support':      'Booking issue — driver not arrived',
    'Payment Support':      'Payment discrepancy or double charge',
    'Cancellation Support': 'Unable to cancel booking',
    'Corporate Enquiry':    'Corporate account setup request',
    'Other':                'General enquiry',
  };

  return Array.from({ length: n }, () => {
    const fn       = pick(firstNames);
    const ln       = pick(lastNames);
    const fullName = `${fn} ${ln}`;
    const mobile   = `9${String(Math.floor(100000000 + Math.random() * 900000000))}`;
    const topic    = pick(topics);
    const createdAt = new Date(Date.now() - rand(30) * 86400000).toISOString();
    return {
      id:         uid('TCK'),
      // ── form fields ──────────────────────────────────────────────────
      fullName,
      mobile,
      email:      Math.random() > 0.35 ? `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com` : '',
      topic,
      message:    pick(sampleMessages),
      // ── derived / admin fields ────────────────────────────────────────
      subject:    subjectMap[topic],
      clientName: fullName,           // kept for backward compat
      priority:   pick(['low','medium','high','critical']),
      status:     pick(Object.values(TICKET_STATUS)),
      isSos:      Math.random() < 0.08,
      createdAt,
      messages:   [{ from: 'client', text: pick(sampleMessages), at: createdAt }],
    };
  });
}

// ── Users ──────────────────────────────────────────────────────────────────
function seedUsers() {
  return [
    { id: uid('USR'), name: 'Abhi Admin',  email: 'admin@abhicabs.in', role: 'admin', status: 'active' },
    { id: uid('USR'), name: 'Ops Manager', email: 'ops@abhicabs.in',   role: 'admin', status: 'active' },
  ];
}

// ── Notifications ──────────────────────────────────────────────────────────
function seedNotifications(n = 20) {
  return Array.from({ length: n }, () => ({
    id: uid('NTF'),
    title: pick(['Booking confirmed','Driver assigned','Payment received','Trip delayed','Invoice generated','SOS triggered']),
    body: 'Tap to view full details of this update.',
    read: Math.random() > 0.4,
    createdAt: new Date(Date.now() - rand(20) * 86400000).toISOString(),
  }));
}

// ── Exports ────────────────────────────────────────────────────────────────
export const masters       = seedMasters();
export const clients       = seedClients();
export const drivers       = seedDrivers();
export const vehicles      = seedVehicles();
export const bookings      = seedBookings();
export const trips         = seedTrips(bookings, drivers, vehicles);
export const payments      = seedPayments(bookings);
export const invoices      = seedInvoices(payments);
export const tickets       = seedTickets();
export const users         = seedUsers();
export const notifications = seedNotifications();
