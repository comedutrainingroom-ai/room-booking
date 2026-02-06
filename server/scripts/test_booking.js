// const axios = require('axios');

async function testBooking() {
    try {
        const roomsRes = await fetch('http://localhost:5000/api/rooms');
        const rooms = await roomsRes.json();
        const roomId = rooms.data[0]._id;

        const startTime = new Date();
        startTime.setHours(startTime.getHours() + 24); // Tomorrow
        startTime.setMinutes(0);
        startTime.setSeconds(0);

        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 2);

        const bookingData = {
            room: roomId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            topic: 'Test Booking',
            user: {
                name: 'Test Tester',
                email: 'test@example.com',
                phone: '0812345678',
                department: 'IT'
            }
        };

        console.log('Sending booking:', bookingData);

        const res = await fetch('http://localhost:5000/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);

    } catch (error) {
        console.log('Error:', error.message);
    }
}

testBooking();
