# House Rant Website


## ADD reviews rating limit (1-5)
```sql
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range_check" CHECK (rating >= 1 AND rating <= 5);
```

## User Authentication
POST `/api/auth/register`

**ADMIN ACCOUNT**
```json
{
    "name": "Pranta Barua", 
    "email": "pranta.admin@mail.com", 
    "password": "1234", 
    "role": "ADMIN", 
    "profilePhoto": "www.testimage.com", 
    "address": "Chittagong", 
    "phone": "012564565"
}
```

**PROVIDER**
```JSON
{
    "name": "Pranta2 Barua", 
    "email": "pranta2.provider@mail.com", 
    "password": "1234", 
    "role": "PROVIDER", 
    "profilePhoto": "www.testimage.com", 
    "address": "Chittagong", 
    "phone": "012564565"
}
```

POST `/api/auth/login`
**ADMIN LOGIN**
```json
{
    "email": "pranta.admin@mail.com", 
    "password": "1234", 
}
```

GET `/api/auth/me`  ROLE:[Role.ADMIN, Role.PROVIDER, Role.CUSTOMER]
POST `/api/auth/logout`
POST `/api/auth/refresh-token`

PATCH `/api/users/profile`
```json
{
    "name": "Pranta Barua",
    "profilePhoto": "www.test.admin.image.com", 
    "address": "Chittagong", 
    "phone": "014345565"
}
```





