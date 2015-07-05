CREATE TABLE v (
id INTEGER PRIMARY KEY AUTOINCREMENT,
t TIMESTAMP
DEFAULT CURRENT_TIMESTAMP,
hum FLOAT not null,
temp FLOAT not null,
bat FLOAT not null,
addr varchar(20) not null
);

INSERT INTO v (temp, hum, bat, addr) VALUES(36,90,5,'00:80:41:ae:fd:7e');

