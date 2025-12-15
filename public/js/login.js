document.getElementById('btn-login').addEventListener('click', async () => {
  const login = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password })
  });

  if (!res.ok) {
    alert('Неверный логин или пароль');
    return;
  }

  window.location.href = '/admin';
});
