import os
os.system('curl -v -H "Origin: http://localhost:5173" -H "Authorization: Bearer ' + 'a'*5000 + '" http://localhost:8000/api/auth/me')
