select
  (row_number() over (partition by 1))::text as "0",
  __testview__."testviewid"::text as "1",
  __testview__."col1"::text as "2",
  __testview__."col2"::text as "3",
  (not (__testview__ is null))::text as "4"
from "a"."testview" as __testview__

select
  __testview__."col1"::text as "0",
  __testview__."testviewid"::text as "1",
  __testview__."col2"::text as "2",
  (not (__testview__ is null))::text as "3"
from "a"."testview" as __testview__
order by __testview__."col1" desc