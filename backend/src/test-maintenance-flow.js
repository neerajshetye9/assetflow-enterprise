const API_URL = 'http://localhost:5000/api';

const login = async (email, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.accessToken;
};

const createRequest = async (token, assetId) => {
  const res = await fetch(`${API_URL}/maintenance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ assetId, issueDescription: 'Screen is flickering', priority: 'HIGH' })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.id;
};

const updateStatus = async (token, requestId, action, body = {}) => {
  const res = await fetch(`${API_URL}/maintenance/${requestId}/${action}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const runTest = async () => {
  try {
    console.log('1. Logging in as Employee...');
    const empToken = await login('liliana.sawayn@acmetech.com', 'password123');

    console.log('2. Creating Maintenance Request...');
    const reqId = await createRequest(empToken, '9daa2cea-55a9-42e1-b1e1-9f79163e52e0');
    console.log(`   -> Created request ID: ${reqId}`);

    console.log('3. Logging in as Asset Manager...');
    const mgrToken = await login('laury.mueller@acmetech.com', 'password123');

    console.log('4. Trying to Approve...');
    await updateStatus(mgrToken, reqId, 'approve');
    console.log('   -> Approved successfully.');

    console.log('5. Trying to Assign Technician...');
    // We need a technician ID. Let's just use the employee's ID for now, or just an external name.
    await updateStatus(mgrToken, reqId, 'assign', { externalTechnicianName: 'Bob the Builder' });
    console.log('   -> Assigned technician successfully.');

    console.log('6. Trying to Start Work...');
    await updateStatus(mgrToken, reqId, 'start');
    console.log('   -> Started work successfully.');

    console.log('7. Trying to Resolve...');
    await updateStatus(mgrToken, reqId, 'resolve', { resolutionNotes: 'Fixed the screen.' });
    console.log('   -> Resolved successfully.');

    console.log('ALL TESTS PASSED.');

  } catch (err) {
    console.error('TEST FAILED.');
  }
};

runTest();
