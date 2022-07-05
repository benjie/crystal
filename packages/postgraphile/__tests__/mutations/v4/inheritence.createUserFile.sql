insert into "inheritence"."user" as __user__ ("id", "name") values ($1::"int4", $2::"text") returning
  __user__."id"::text as "0",
  __user__."name" as "1"


insert into "inheritence"."user_file" as __user_file__ ("filename", "user_id") values ($1::"text", $2::"int4") returning
  __user_file__."id"::text as "0",
  __user_file__."filename" as "1",
  __user_file__."user_id"::text as "2"


select __user_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __user_identifiers__,
lateral (
  select
    __user__."id"::text as "0",
    __user__."name" as "1",
    __user_identifiers__.idx as "2"
  from "inheritence"."user" as __user__
  where (
    __user__."id" = __user_identifiers__."id0"
  )
  order by __user__."id" asc
) as __user_result__