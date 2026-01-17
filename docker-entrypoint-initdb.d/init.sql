USE pesapaldb;
CREATE TABLE User(id INT PRIMARY KEY AUTO_INCREMENT, -- auto -indexed
                    fname VARCHAR(100) NOT NULL, 
                    lname VARCHAR(100) NOT NULL, 
                    phone VARCHAR(25) NOT NULL UNIQUE, -- auto indexed
                    deleted BOOLEAN NOT NULL DEFAULT FALSE, 
                    date_created BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP()), 
                    date_updated BIGINT NOT NULL DEFAULT (date_created), 
                    date_deleted BIGINT NOT NULL DEFAULT -1);
DESC User;
-- Schema for a shop ---
CREATE TABLE Shop(id INT PRIMARY KEY AUTO_INCREMENT, 
                    sname VARCHAR(100) NOT NULL, 
                    shop_owner INT NOT NULL, 
                    date_created BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP()), 
                    date_updated BIGINT NOT NULL DEFAULT (date_created), 
                    date_deleted BIGINT NOT NULL DEFAULT -1, 
                    deleted BOOLEAN NOT NULL DEFAULT FALSE,
                    FOREIGN KEY (shop_owner) REFERENCES User(id)
                    );
DESC Shop;

-- Schema for products ---- 
CREATE TABLE Product(id INT PRIMARY KEY AUTO_INCREMENT, 
                        pname VARCHAR(100) NOT NULL, 
                        date_created BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
                        date_updated BIGINT NOT NULL DEFAULT (date_created),
                        description TEXT NOT NULL);
DESC Product;
-- Every shop has a set of products, make schema for that catalog ---
CREATE TABLE Catalog(id INT PRIMARY KEY AUTO_INCREMENT, 
                        shop_id INT NOT NULL, 
                        product_id INT NOT NULL,
                        FOREIGN KEY (shop_id) REFERENCES Shop(id),
                        FOREIGN KEY (product_id) REFERENCES Product(id),
                        INDEX idx_shop_product_ids (shop_id, product_id), -- composite index
                        INDEX idx_shop_id (shop_id),
                        INDEX idx_product_id (product_id)
                        );
DESC Catalog;
-- To extend credit to users, make schema for debt table --- 
CREATE TABLE Debt(id INT PRIMARY KEY AUTO_INCREMENT, 
                    creditor_shop_id INT NOT NULL, 
                    debtor_user_id INT NOT NULL, 
                    product_id INT NOT NULL, 
                    quantity INT NOT NULL, 
                    unit_price DECIMAL(10,2) NOT NULL,
                    total_price DECIMAL(10, 2) AS (unit_price*quantity) STORED NOT NULL,
                    date_issued BIGINT NOT NULL  DEFAULT (UNIX_TIMESTAMP()),
                    forgiven BOOLEAN NOT NULL DEFAULT FALSE,
                    date_forgiven BIGINT NOT NULL  DEFAULT -1,
                    FOREIGN KEY (product_id) REFERENCES Product(id),
                    FOREIGN KEY (debtor_user_id) REFERENCES User(id),
                    FOREIGN KEY (creditor_shop_id) REFERENCES Shop(id),
                    INDEX idx_forgiven_creditor_shop_id (forgiven, creditor_shop_id),
                    INDEX idx_creditor_shop_id (creditor_shop_id),
                    INDEX idx_product_id (product_id),
                    INDEX idx_debtor_user_id (debtor_user_id));
DESC Debt;
-- Record when users pay their debts ---
CREATE TABLE Settlement(id INT PRIMARY KEY AUTO_INCREMENT, 
                            debt_id INT NOT NULL,
                            amount BIGINT NOT NULL,
                            settlement_date BIGINT NOT NULL DEFAULT (UNIX_TIMESTAMP()),
                            is_full_settlement BOOLEAN NOT NULL,
                            comments TEXT NOT NULL);



-- Lets create some users
INSERT INTO User(fname, phone, lname) 
VALUES('Samuel Ngugi',"0721234567", "Ndung'u"),
      ('Peter Njenga', "0721234568", "Mwangi"),
      ("One Man", "0712345566", "Guitar"); 

-- Add some products --
INSERT INTO Product(pname, description) 
VALUES  ("Face Towel", "The best face towel ever made."),
        ("Hand Towel", "The best hand towel ever made."),
        ("Leg Towel",  "The best leg towel ever made."),
        ("Armpit Towel", "The best armpit towel ever made.");

-- Make users (id=1, and id=2) own 4 different shops ---
INSERT INTO Shop(sname, shop_owner) 
VALUES  ("Winkel Shop", 1),
        ("Duka Shop", 2),
        ("Jirani Shop", 1),
        ("Hakuna Deni Shop", 2);

-- extend credit to customers
INSERT INTO Debt(creditor_shop_id, debtor_user_id, product_id, quantity, unit_price) 
VALUES  (1, 2, 2, 2, 10),
        (1, 2, 3, 1, 20),
        (2, 3, 2, 2, 30),
        (2, 3, 3, 1, 40);

-- Build catalog for our only available shop (id = 1) ---
INSERT INTO Catalog (shop_id, product_id) 
VALUES  (1, 1),
        (1, 2),
        (1, 3),
        (1, 4),
        (2, 1),
        (2, 2),
        (2, 3),
        (2, 4);
-- Lets Settle some debts, partially and fully
INSERT INTO Settlement(debt_id, amount, is_full_settlement, comments) 
VALUES  (1, 20, TRUE, "Partial payment"),
        (2, 20, TRUE, "Partial payment"),
        (3, 5, FALSE, "Partial payment"),
        (4, 15, FALSE, "Partial payment");

-- The Database is populated! 
-- Let us make some queries
-- A quick overview dashboard showing cumulative debt that has ever been given
SELECT DISTINCT  
        CONCAT(u.fname, ' ', u.lname) AS owner,
        s.sname,
        u.phone,
        SUM(d.quantity * d.unit_price) AS total
FROM Shop s 
INNER JOIN Debt d ON 
        d.creditor_shop_id = s.id
INNER JOIN User u ON
        u.id = s.shop_owner
WHERE 
    d.forgiven = FALSE
GROUP BY 
        d.creditor_shop_id, 
        s.sname,
        u.fname,
        u.lname,
        u.phone;


-- Now lets find all the debtors of a shop and the products they took on credit
SELECT DISTINCT
    CONCAT(u.fname, ' ', u.lname) as debtor,
    p.pname,
    u.phone,
    p.description,
    d.quantity,
    d.unit_price,
    d.forgiven,
    d.quantity * d.unit_price AS total
FROM Shop s
INNER JOIN Debt d ON 
        d.creditor_shop_id = s.id
INNER JOIN Product p ON
        d.product_id = p.id
INNER JOIN User u ON
        u.id = d.debtor_user_id;

-- Lets give a history of debts that have already been paid for a given shop
SELECT
    CONCAT(u.fname, ' ', u.lname) AS debtor,
    u.phone AS debtor_phone,
    p.pname as product,
    d.quantity,
    d.unit_price,
    d.quantity * d.unit_price AS total,
    stlmt.settlement_date,
    stlmt.is_full_settlement
FROM Shop s 
INNER JOIN Debt d ON 
    s.id = d.creditor_shop_id
INNER JOIN Product p ON
    p.id = d.product_id
INNER JOIN Settlement stlmt ON
    stlmt.id = d.id
INNER JOIN User u ON 
    u.id = d.debtor_user_id
WHERE 
    d.forgiven = FALSE;

-- Lets display the catalog of a shop 
SELECT  p.pname,
        p.description,
        s.sname
FROM Shop s 
INNER JOIN Catalog c ON
    s.id = c.shop_id
INNER JOIN Product p ON
    p.id = c.product_id;

-- Lets update the Product by changing the description
UPDATE Debt
SET date_forgiven = UNIX_TIMESTAMP(), forgiven=TRUE
WHERE id = 5; -- Parameterize this in nodejs

-- Lets remove a catalog item that is no longer stocked by a shop
DELETE FROM Catalog WHERE shop_id=1 AND product_id=2;










