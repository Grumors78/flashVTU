async function checkBackend() {
  const out = document.getElementById('output');
  out.textContent = 'Checking...';
  try {
    const res = await fetch(`${window.BACKEND_URL}/`);
    const json = await res.json();
    out.textContent = 'Response: ' + (json.message || JSON.stringify(json));
  } catch (err) {
    out.textContent = 'Error: ' + err.message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('checkBtn').addEventListener('click', checkBackend);
});
