// Test with minimal data
const webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL;
async function simpleTest() {
  console.log('Testing with minimal data...');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: "hello"
      })
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

simpleTest();