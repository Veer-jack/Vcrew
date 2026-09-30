const bcrypt = require('bcryptjs');
const hash = "$2b$12$HiVSHas2q46rT6oLeQeuaem3wtTbisPEu5/yhhPXb9EGZU1dBtibK";
const passwords = [
  "Validate@123",
  "validate@123",
  "Jaya@123",
  "Madhuri@123",
  "Jayamadhuri@123",
  "jmadhuri@123",
  "Password@123",
  "Admin@123",
  "Test@123",
  "JayaMadhuri@123",
  "12345678"
];
console.log("Hash to test:", hash);
let found = false;
for (const p of passwords) {
  if (bcrypt.compareSync(p, hash)) {
    console.log("MATCH FOUND:", p);
    found = true;
  }
}
if (!found) console.log("NO MATCHES IN LIST");
