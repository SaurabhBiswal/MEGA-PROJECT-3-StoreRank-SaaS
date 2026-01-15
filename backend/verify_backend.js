const API_URL = 'http://localhost:5000/api';

async function testBackend() {
    console.log('🚀 Starting Backend Verification...');

    try {
        
        const userName = "Saurabh Biswal";
        console.log(`\n1. Testing Registration for "${userName}" (Length: ${userName.length})...`);

        const email = `saurabh${Date.now()}@test.com`;

        const regRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: userName,
                email: email,
                password: "Password@123",
                address: "Test Address 123",
                role: "user"
            })
        });

        const regData = await regRes.json();

        if (regRes.ok && regData.success) {
            console.log('✅ Registration Successful!');
        } else {
            if (regData.error === 'Email already exists') {
                console.log('User already exists, proceeding to login...');
            } else {
                console.error('❌ Registration Failed:', regData);
            }
        }

        console.log('\n2. Testing Registration for "Tiny" (4 chars) - Expect Fail...');

        const failRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "Tiny",
                email: `tiny${Date.now()}@test.com`,
                password: "Password@123",
                address: "Test Address",
                role: "user"
            })
        });

        if (failRes.status === 400) {
            console.log('✅ Correctly rejected short name.');
        } else {
            console.error('❌ Unexpected status:', failRes.status);
        }

        console.log('\n3. Testing Login...');
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                password: "Password@123"
            })
        });

        const loginData = await loginRes.json();
        if (loginRes.ok) {
            console.log('✅ Login Successful! Token received.');
        } else {
            console.error('❌ Login Failed:', loginData);
        }

        console.log('\n4. Testing Store Sorting (Name DESC)...');
        const storesRes = await fetch(`${API_URL}/stores?sortBy=name&order=desc`);
        const storesData = await storesRes.json();

        const storeNames = storesData.map(s => s.name);
        console.log('Store Names (DESC):', storeNames);

        const sortedNames = [...storeNames].sort().reverse();
        if (JSON.stringify(storeNames) === JSON.stringify(sortedNames)) {
            console.log('✅ Sorting works!');
        } else {
            console.error('❌ Sorting failed.');
        }

    } catch (err) {
        console.error('❌ Verification Failed:', err);
    }
}

testBackend();
