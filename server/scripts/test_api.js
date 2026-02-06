async function testApi() {
    try {
        console.log('Testing GET http://localhost:5000/api/settings...');
        const res = await fetch('http://localhost:5000/api/settings');
        console.log('GET Settings Status:', res.status);
        const data = await res.json();
        // console.log('Response:', data);

        console.log('\nTesting POST http://localhost:5000/api/rooms...');
        const roomData = {
            name: 'Test Room ' + Date.now(),
            capacity: 10,
            equipment: ['Test Eq'],
            description: 'Test Description',
            images: []
        };
        const res2 = await fetch('http://localhost:5000/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roomData)
        });
        console.log('POST Rooms Status:', res2.status);
        const data2 = await res2.json();
        console.log('Response:', data2);

    } catch (error) {
        console.log('Error:', error.message);
    }
}

testApi();
