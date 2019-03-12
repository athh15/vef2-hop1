CREATE TABLE categories (
  id serial primary key,
  title varchar(128) not null
);

CREATE TABLE products (
  id serial primary key,
  -- category_id serial REFERENCES categories(id),
  title varchar(128) not null,
  price int not null,
  about text not null,
  img text,
  created timestamp with time zone not null default current_timestamp
);

CREATE TABLE users (
  id serial primary key,
  email varchar(256) not null,
  password varchar(128) not null,
  admin boolean default false
);

CREATE TABLE orders (
  id serial primary key,
  user_id serial REFERENCES users(id),
  is_order boolean,
  name varchar(128),
  address varchar(128),
  created timestamp with time zone not null default current_timestamp
);

CREATE TABLE productorders (
  id serial primary key,
  order_id serial REFERENCES orders(id),
  product_id serial REFERENCES products(id),
  amount int not null
);
