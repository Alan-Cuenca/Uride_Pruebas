async function test() {
  try {
    const res = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pasajero@test.uta.edu.ec', password: 'DemoClave123*' })
    });
    const data = await res.json();
    const token = data.token;

    const postRes = await fetch('http://127.0.0.1:5000/api/viajes?lat=-1.259&lon=-78.631&radio=5000', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const postData = await postRes.json();
    console.log("Status:", postRes.status);
    console.dir(postData, { depth: null });
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
