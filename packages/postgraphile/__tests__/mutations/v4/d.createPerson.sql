insert into "d"."person" as __person__ ("last_name", "col_no_update", "col_no_order", "col_no_filter") values ($1::"varchar", $2::"text", $3::"text", $4::"text") returning
  __person__."id"::text as "0",
  __person__."first_name" as "1",
  __person__."last_name" as "2",
  __person__."col_no_create" as "3",
  __person__."col_no_update" as "4",
  __person__."col_no_order" as "5",
  __person__."col_no_filter" as "6",
  __person__."col_no_create_update" as "7",
  __person__."col_no_create_update_order_filter" as "8"
