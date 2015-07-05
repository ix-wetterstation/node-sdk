CREATE TABLE v (
id INTEGER PRIMARY KEY AUTOINCREMENT,
t TIMESTAMP
DEFAULT CURRENT_TIMESTAMP,
hum FLOAT not null,
temp FLOAT not null,
bat FLOAT not null,
addr varchar(20) not null
);

