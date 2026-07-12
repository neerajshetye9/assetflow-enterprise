require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const { execSync } = require('child_process');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'assetflow',
  password: process.env.DB_PASSWORD || 'assetflow_secret',
  database: process.env.DB_NAME || 'assetflow_enterprise',
});

const ORGS = [
  { 
    name: 'Acme Tech Solutions', code: 'TECH', domain: 'acmetech.com',
    depts: ['Engineering', 'IT', 'Product', 'HR', 'Maintenance'], 
    locs: ['HQ - Silicon Valley', 'NYC Office'], 
    resources: [{name:'Boardroom A', type:'ROOM', cap:12}, {name:'Server Rack 1', type:'EQUIPMENT', cap:0}], 
    assetCats: ['Laptops', 'Monitors', 'Servers'] 
  },
  { 
    name: 'City Health Hospital', code: 'MED', domain: 'cityhealth.org',
    depts: ['Surgery', 'Nursing', 'Administration', 'Pharmacy', 'Maintenance'], 
    locs: ['Main Campus', 'North Wing'], 
    resources: [{name:'Operating Theater 1', type:'ROOM', cap:5}, {name:'Ambulance A1', type:'VEHICLE', cap:2}], 
    assetCats: ['Medical Devices', 'Beds', 'IT Equipment'] 
  },
  { 
    name: 'Global Manufacturing Inc.', code: 'MFG', domain: 'globalmfg.net',
    depts: ['Assembly', 'Logistics', 'Quality Assurance', 'Safety', 'Maintenance'], 
    locs: ['Plant 1', 'Warehouse A'], 
    resources: [{name:'Forklift FL-100', type:'VEHICLE', cap:1}, {name:'CNC Machine A', type:'EQUIPMENT', cap:0}], 
    assetCats: ['Machinery', 'Tools', 'Vehicles'] 
  },
  { 
    name: 'National University', code: 'EDU', domain: 'national.edu',
    depts: ['Science Faculty', 'Arts Faculty', 'Library', 'IT Services', 'Maintenance'], 
    locs: ['Main Campus', 'Science Block'], 
    resources: [{name:'Auditorium 1', type:'ROOM', cap:200}, {name:'Chemistry Lab 3', type:'OTHER', cap:30}], 
    assetCats: ['Projectors', 'Computers', 'Lab Equipment'] 
  },
  { 
    name: 'Swift Logistics', code: 'LOG', domain: 'swiftlog.com',
    depts: ['Fleet Management', 'Dispatch', 'Customer Service', 'Maintenance'], 
    locs: ['Hub 1', 'Hub 2'], 
    resources: [{name:'Delivery Van V1', type:'VEHICLE', cap:2}], 
    assetCats: ['Trucks', 'Scanners', 'Office Furniture'] 
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('--- RESETTING DATABASE ---');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO assetflow');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    console.log('Schema dropped and recreated.');

    console.log('--- RUNNING MIGRATIONS ---');
    execSync('node src/migrate.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    console.log('--- GENERATING MOCK DATA ---');
    const passwordHash = await bcrypt.hash('password123', 10);
    const summary = [];

    const { rows: roles } = await client.query('SELECT id, code FROM roles');
    const roleMap = {};
    for (const r of roles) roleMap[r.code] = r.id;
    if (Object.keys(roleMap).length === 0) throw new Error('Migrations did not insert roles!');

    for (const org of ORGS) {
      console.log(`\n> Seeding Org: ${org.name}...`);
      
      // 1. Org
      const { rows: [dbOrg] } = await client.query(
        `INSERT INTO organizations (name, code) VALUES ($1, $2) RETURNING id`,
        [org.name, org.code]
      );
      const orgId = dbOrg.id;

      // 2. Locations
      const locIds = [];
      for (const loc of org.locs) {
        const { rows: [dbLoc] } = await client.query(
          `INSERT INTO locations (organization_id, name, address) VALUES ($1, $2, $3) RETURNING id`,
          [orgId, loc, faker.location.streetAddress()]
        );
        locIds.push(dbLoc.id);
      }

      // 3. Departments
      const deptIds = [];
      for (const dept of org.depts) {
        const { rows: [dbDept] } = await client.query(
          `INSERT INTO departments (organization_id, name, code) VALUES ($1, $2, $3) RETURNING id`,
          [orgId, dept, dept.substring(0,4).toUpperCase().replace(/ /g, '')]
        );
        deptIds.push(dbDept.id);
      }

      // 4. Admin User
      const adminEmail = `admin@${org.domain}`;
      const { rows: [adminUser] } = await client.query(
        `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
        [`${org.name} Admin`, adminEmail, passwordHash]
      );
      const { rows: [adminMem] } = await client.query(
        `INSERT INTO organization_memberships (user_id, organization_id, employee_code, job_title) VALUES ($1, $2, $3, $4) RETURNING id`,
        [adminUser.id, orgId, `${org.code}-ADM`, 'System Administrator']
      );
      await client.query(`INSERT INTO membership_roles (membership_id, role_id) VALUES ($1, $2)`, [adminMem.id, roleMap['ADMIN']]);
      summary.push({ Org: org.name, Email: adminEmail, Role: 'ADMIN', Password: 'password123' });

      // 5. Employees
      const empIds = [];
      let empCounter = 1;
      for (const deptId of deptIds) {
        const empCount = faker.number.int({ min: 3, max: 5 });
        for (let i=0; i<empCount; i++) {
          const fn = faker.person.firstName();
          const ln = faker.person.lastName();
          const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@${org.domain}`;
          
          const { rows: [u] } = await client.query(
            `INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
            [`${fn} ${ln}`, email, passwordHash]
          );
          const { rows: [m] } = await client.query(
            `INSERT INTO organization_memberships (user_id, organization_id, department_id, employee_code, job_title) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [u.id, orgId, deptId, `${org.code}-${empCounter.toString().padStart(3,'0')}`, faker.person.jobTitle()]
          );
          empIds.push(m.id);
          empCounter++;

          if (i === 0) {
            await client.query(`INSERT INTO membership_roles (membership_id, role_id) VALUES ($1, $2)`, [m.id, roleMap['DEPARTMENT_HEAD']]);
            await client.query(`UPDATE departments SET head_membership_id = $1 WHERE id = $2`, [m.id, deptId]);
            summary.push({ Org: org.name, Email: email, Role: 'DEPT_HEAD', Password: 'password123' });
          } else if (i === 1 && deptIds.indexOf(deptId) === 0) {
            await client.query(`INSERT INTO membership_roles (membership_id, role_id) VALUES ($1, $2)`, [m.id, roleMap['ASSET_MANAGER']]);
            summary.push({ Org: org.name, Email: email, Role: 'ASSET_MANAGER', Password: 'password123' });
          }
        }
      }

      // 6. Asset Categories & Assets
      const assetIds = [];
      let assetCounter = 1;
      for (const cat of org.assetCats) {
        const { rows: [dbCat] } = await client.query(
          `INSERT INTO asset_categories (organization_id, name, code) VALUES ($1, $2, $3) RETURNING id`,
          [orgId, cat, cat.substring(0,4).toUpperCase().replace(/ /g, '')]
        );

        const assetCount = faker.number.int({ min: 10, max: 15 });
        for (let i=0; i<assetCount; i++) {
          const { rows: [a] } = await client.query(
            `INSERT INTO assets (organization_id, category_id, location_id, asset_tag, name, serial_number, acquisition_cost, condition, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [
              orgId, dbCat.id, faker.helpers.arrayElement(locIds), 
              `${org.code}-AST-${assetCounter.toString().padStart(4,'0')}`,
              `${cat} - ${faker.commerce.productName()}`,
              faker.string.alphanumeric(10).toUpperCase(),
              faker.commerce.price({ min: 100, max: 5000 }),
              faker.helpers.arrayElement(['NEW', 'GOOD', 'FAIR']),
              'AVAILABLE'
            ]
          );
          assetIds.push(a.id);
          assetCounter++;
        }
      }

      // 7. Asset Allocations
      const allocatedAssets = faker.helpers.shuffle(assetIds).slice(0, Math.floor(assetIds.length * 0.6));
      for (const aid of allocatedAssets) {
        const isOverdue = faker.datatype.boolean();
        const returnDate = isOverdue ? faker.date.recent({ days: 10 }) : faker.date.soon({ days: 30 });
        const allocatedAt = faker.date.recent({ days: 60 });
        
        await client.query(
          `INSERT INTO asset_allocations (organization_id, asset_id, employee_id, status, allocated_at, expected_return_at, allocated_by)
           VALUES ($1, $2, $3, 'ACTIVE', $4, $5, $6)`,
          [orgId, aid, faker.helpers.arrayElement(empIds), allocatedAt, returnDate, adminMem.id]
        );
        await client.query(`UPDATE assets SET status = 'ALLOCATED' WHERE id = $1`, [aid]);
      }

      // 8. Maintenance
      const availAssets = assetIds.filter(id => !allocatedAssets.includes(id));
      const maintAssets = availAssets.slice(0, 3);
      for (const aid of maintAssets) {
        const reqBy = faker.helpers.arrayElement(empIds);
        await client.query(
          `INSERT INTO maintenance_requests (organization_id, asset_id, requested_by, priority, issue_description, status)
           VALUES ($1, $2, $3, $4, $5, 'IN_PROGRESS')`,
          [orgId, aid, reqBy, faker.helpers.arrayElement(['HIGH','MEDIUM']), faker.lorem.sentence()]
        );
        await client.query(`UPDATE assets SET status = 'UNDER_MAINTENANCE' WHERE id = $1`, [aid]);
      }

      // 9. Resources & Bookings
      for (const res of org.resources) {
        const { rows: [dbRes] } = await client.query(
          `INSERT INTO resources (organization_id, location_id, name, resource_type, capacity, status)
           VALUES ($1, $2, $3, $4, $5, 'AVAILABLE') RETURNING id`,
          [orgId, faker.helpers.arrayElement(locIds), res.name, res.type, res.cap]
        );

        let currentStart = faker.date.soon({ days: 1 });
        for (let i=0; i<3; i++) {
          const durationHrs = faker.number.int({ min: 1, max: 4 });
          const endAt = new Date(currentStart.getTime() + durationHrs * 60 * 60 * 1000);

          await client.query(
            `INSERT INTO resource_bookings (organization_id, resource_id, booked_by, title, start_at, end_at, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'UPCOMING')`,
            [orgId, dbRes.id, faker.helpers.arrayElement(empIds), `${res.name} Meeting`, currentStart, endAt]
          );

          currentStart = new Date(endAt.getTime() + (faker.number.int({ min: 1, max: 24 }) * 60 * 60 * 1000));
        }
      }
    }

    console.log('\n--- SEED COMPLETE ---');
    console.table(summary);

  } catch (err) {
    console.error('Seed Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
