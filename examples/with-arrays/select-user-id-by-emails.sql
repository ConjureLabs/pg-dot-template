select user_id
from user_emails
where email in (!PG{emails})
limit 1
