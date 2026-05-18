-- Migration: change foreign keys referencing ARTICULOS to ON DELETE CASCADE
-- WARNING: High-impact operation. BACKUP your schema before running.
-- This script will:
--  1) Find all referential constraints (FKs) that reference a constraint on the ARTICULOS table in the current schema.
--  2) For each FK it will DROP the constraint and re-create it with ON DELETE CASCADE.
--  3) Print rollback statements (re-create without ON DELETE CASCADE) via DBMS_OUTPUT.

SET SERVEROUTPUT ON SIZE 1000000;

DECLARE
  CURSOR fk_cur IS
    SELECT ac.constraint_name,
           ac.table_name,
           (SELECT LISTAGG(column_name, ',') WITHIN GROUP (ORDER BY position)
              FROM user_cons_columns
             WHERE constraint_name = ac.constraint_name) child_cols,
           (SELECT LISTAGG(column_name, ',') WITHIN GROUP (ORDER BY position)
              FROM user_cons_columns
             WHERE constraint_name = ac.r_constraint_name) parent_cols
      FROM user_constraints ac
     WHERE ac.constraint_type = 'R'
       AND ac.r_constraint_name IN (
         SELECT constraint_name FROM user_constraints WHERE table_name = 'ARTICULOS'
       );

  v_sql_drop   VARCHAR2(4000);
  v_sql_add    VARCHAR2(4000);
  v_sql_rollback VARCHAR2(4000);

BEGIN
  DBMS_OUTPUT.PUT_LINE('Starting FK conversion to ON DELETE CASCADE for constraints referencing ARTICULOS');

  FOR r IN fk_cur LOOP
    BEGIN
      v_sql_drop := 'ALTER TABLE "' || r.table_name || '" DROP CONSTRAINT "' || r.constraint_name || '"';
      v_sql_add  := 'ALTER TABLE "' || r.table_name || '" ADD CONSTRAINT "' || r.constraint_name || '" FOREIGN KEY (' || r.child_cols || ') REFERENCES ARTICULOS(' || r.parent_cols || ') ON DELETE CASCADE';
      v_sql_rollback := 'ALTER TABLE "' || r.table_name || '" ADD CONSTRAINT "' || r.constraint_name || '" FOREIGN KEY (' || r.child_cols || ') REFERENCES ARTICULOS(' || r.parent_cols || ')';

      DBMS_OUTPUT.PUT_LINE('---');
      DBMS_OUTPUT.PUT_LINE('Processing constraint: ' || r.constraint_name || ' on table ' || r.table_name);
      DBMS_OUTPUT.PUT_LINE('DROP SQL: ' || v_sql_drop);
      DBMS_OUTPUT.PUT_LINE('ADD (with cascade) SQL: ' || v_sql_add);
      DBMS_OUTPUT.PUT_LINE('Rollback (recreate without cascade): ' || v_sql_rollback);

      -- Drop existing FK
      EXECUTE IMMEDIATE v_sql_drop;
      -- Recreate with ON DELETE CASCADE
      EXECUTE IMMEDIATE v_sql_add;

      DBMS_OUTPUT.PUT_LINE('Converted constraint: ' || r.constraint_name);
    EXCEPTION
      WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('ERROR converting constraint ' || r.constraint_name || ': ' || SQLERRM);
        -- Continue with next constraint
    END;
  END LOOP;

  DBMS_OUTPUT.PUT_LINE('FK conversion finished. Review output for rollback statements.');
EXCEPTION
  WHEN OTHERS THEN
    DBMS_OUTPUT.PUT_LINE('FATAL ERROR: ' || SQLERRM);
    RAISE;
END;
/

-- Notes / Rollback: The DBMS_OUTPUT above prints a set of "recreate" statements without ON DELETE CASCADE.
-- To rollback, run the printed rollback statements (they re-create the FK without cascading deletes).
-- Recommended workflow:
--  1) Run a full export/backup of the schema.
--  2) Run this script in a staging environment and exercise application flows.
--  3) If acceptable, run in production during a maintenance window.
--  4) If something goes wrong, run the rollback statements printed earlier.
