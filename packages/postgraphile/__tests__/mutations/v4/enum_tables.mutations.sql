delete from "enum_tables"."letter_descriptions" as __letter_descriptions__ where (__letter_descriptions__."letter" = $1::"text") returning
  __letter_descriptions__."id"::text as "0",
  __letter_descriptions__."letter"::text as "1",
  __letter_descriptions__."letter_via_view"::text as "2"


insert into "enum_tables"."letter_descriptions" as __letter_descriptions__ ("letter", "letter_via_view", "description") values ($1::"text", $2::"text", $3::"text") returning
  __letter_descriptions__."id"::text as "0",
  __letter_descriptions__."letter"::text as "1",
  __letter_descriptions__."letter_via_view"::text as "2",
  __letter_descriptions__."description" as "3"


select __referencing_table_mutation_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"enum_tables"."referencing_table" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __referencing_table_mutation_identifiers__,
lateral (
  select
    __referencing_table_mutation__.v::text as "0",
    __referencing_table_mutation_identifiers__.idx as "1"
  from "enum_tables"."referencing_table_mutation"(__referencing_table_mutation_identifiers__."id0") as __referencing_table_mutation__(v)
) as __referencing_table_mutation_result__