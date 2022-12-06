insert into "b"."types" as __types__ ("id", "smallint", "bigint", "numeric", "decimal", "boolean", "varchar", "enum", "enum_array", "domain", "domain2", "text_array", "json", "jsonb", "numrange", "daterange", "an_int_range", "timestamp", "timestamptz", "date", "time", "timetz", "interval", "interval_array", "money", "compound_type", "nested_compound_type", "point", "cidr", "macaddr", "text_array_domain", "int8_array_domain") values ($1::"int4", $2::"int2", $3::"int8", $4::"numeric", $5::"numeric", $6::"bool", $7::"varchar", $8::"b"."color", $9::"b"."color"[], $10::"a"."an_int", $11::"b"."another_int", $12::"text"[], $13::"json", $14::"jsonb", $15::"pg_catalog"."numrange", $16::"pg_catalog"."daterange", $17::"a"."an_int_range", $18::"timestamp", $19::"timestamptz", $20::"date", $21::"time", $22::"timetz", $23::"interval", $24::"interval"[], $25::"money", $26::"c"."compound_type", $27::"b"."nested_compound_type", $28::"point", $29::"cidr", $30::"macaddr", $31::"c"."text_array_domain", $32::"c"."int8_array_domain") returning
  __types__."id"::text as "0",
  __types__."smallint"::text as "1",
  __types__."bigint"::text as "2",
  __types__."numeric"::text as "3",
  __types__."decimal"::text as "4",
  __types__."boolean"::text as "5",
  __types__."varchar" as "6",
  __types__."enum"::text as "7",
  __types__."enum_array"::text as "8",
  __types__."domain"::text as "9",
  __types__."domain2"::text as "10",
  __types__."text_array"::text as "11",
  __types__."json"::text as "12",
  __types__."jsonb"::text as "13",
  __types__."int8_array_domain"::text as "14",
  __types__."text_array_domain"::text as "15",
  __types__."macaddr"::text as "16",
  __types__."cidr"::text as "17",
  __types__."inet"::text as "18",
  __types__."nullablePoint"::text as "19",
  __types__."point"::text as "20",
  __types__."numrange"::text as "21",
  __types__."nested_compound_type"::text as "22",
  __types__."compound_type"::text as "23",
  __types__."money"::numeric::text as "24",
  (
    select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
    from unnest(__types__."interval_array") t
  )::text as "25",
  to_char(__types__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "26",
  to_char(date '1970-01-01' + __types__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "27",
  to_char(date '1970-01-01' + __types__."time", 'HH24:MI:SS.US'::text) as "28",
  to_char(__types__."date", 'YYYY-MM-DD'::text) as "29",
  to_char(__types__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "30",
  to_char(__types__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "31",
  json_build_array(
    lower_inc(__types__."daterange"),
    to_char(lower(__types__."daterange"), 'YYYY-MM-DD'::text),
    to_char(upper(__types__."daterange"), 'YYYY-MM-DD'::text),
    upper_inc(__types__."daterange")
  )::text as "32",
  __types__."an_int_range"::text as "33";

select __frmcdc_compound_type_1_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"c"."compound_type" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __frmcdc_compound_type_1_identifiers__,
lateral (
  select
    __frmcdc_compound_type_1__."foo_bar"::text as "0",
    __frmcdc_compound_type_1__."f"::text as "1",
    __frmcdc_compound_type_1__."e"::text as "2",
    __frmcdc_compound_type_1__."d" as "3",
    __frmcdc_compound_type_1__."c"::text as "4",
    __frmcdc_compound_type_1__."b" as "5",
    __frmcdc_compound_type_1__."a"::text as "6",
    (not (__frmcdc_compound_type_1__ is null))::text as "7",
    __frmcdc_compound_type_1_identifiers__.idx as "8"
  from (select (__frmcdc_compound_type_1_identifiers__."id0").*) as __frmcdc_compound_type_1__
) as __frmcdc_compound_type_1_result__;

select __frmcdc_nested_compound_type_1_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"b"."nested_compound_type" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __frmcdc_nested_compound_type_1_identifiers__,
lateral (
  select
    __frmcdc_nested_compound_type_1__."baz_buz"::text as "0",
    __frmcdc_compound_type_1__."foo_bar"::text as "1",
    __frmcdc_compound_type_1__."f"::text as "2",
    __frmcdc_compound_type_1__."e"::text as "3",
    __frmcdc_compound_type_1__."d" as "4",
    __frmcdc_compound_type_1__."c"::text as "5",
    __frmcdc_compound_type_1__."b" as "6",
    __frmcdc_compound_type_1__."a"::text as "7",
    (not (__frmcdc_compound_type_1__ is null))::text as "8",
    __frmcdc_compound_type_1_2."foo_bar"::text as "9",
    __frmcdc_compound_type_1_2."f"::text as "10",
    __frmcdc_compound_type_1_2."e"::text as "11",
    __frmcdc_compound_type_1_2."d" as "12",
    __frmcdc_compound_type_1_2."c"::text as "13",
    __frmcdc_compound_type_1_2."b" as "14",
    __frmcdc_compound_type_1_2."a"::text as "15",
    (not (__frmcdc_compound_type_1_2 is null))::text as "16",
    (not (__frmcdc_nested_compound_type_1__ is null))::text as "17",
    __frmcdc_nested_compound_type_1_identifiers__.idx as "18"
  from (select (__frmcdc_nested_compound_type_1_identifiers__."id0").*) as __frmcdc_nested_compound_type_1__
  left outer join lateral (select (__frmcdc_nested_compound_type_1__."b").*) as __frmcdc_compound_type_1__
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1__."a").*) as __frmcdc_compound_type_1_2
  on TRUE
) as __frmcdc_nested_compound_type_1_result__;

insert into "c"."person" as __person__ ("id", "person_full_name", "about", "email", "config", "last_login_from_ip", "last_login_from_subnet", "user_mac") values ($1::"int4", $2::"varchar", $3::"text", $4::"b"."email", $5::"hstore", $6::"inet", $7::"cidr", $8::"macaddr") returning
  __person__::text as "0",
  __person__."user_mac"::text as "1",
  __person__."last_login_from_subnet"::text as "2",
  __person__."last_login_from_ip"::text as "3",
  __person__."config"::text as "4",
  __person__."about" as "5",
  __person__."email" as "6",
  __person__."person_full_name" as "7",
  __person__."id"::text as "8";

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" desc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person__."email" as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."email" asc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person__."email" as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."email" desc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person__."email" as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."email" desc, __person__."id" desc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"c"."person" as "id0",
    (ids.value->>1)::"b"."email" as "id1"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    ("c"."person_exists"(
      __person__,
      __person_identifiers__."id1"
    ))::text as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from (select (__person_identifiers__."id0").*) as __person__
  order by __person__."id" asc
) as __person_result__;

insert into "c"."person" as __person__ ("id", "person_full_name", "about", "email", "config", "last_login_from_ip", "last_login_from_subnet", "user_mac") values ($1::"int4", $2::"varchar", $3::"text", $4::"b"."email", $5::"hstore", $6::"inet", $7::"cidr", $8::"macaddr") returning
  __person__::text as "0",
  __person__."user_mac"::text as "1",
  __person__."last_login_from_subnet"::text as "2",
  __person__."last_login_from_ip"::text as "3",
  __person__."config"::text as "4",
  __person__."about" as "5",
  __person__."email" as "6",
  __person__."person_full_name" as "7",
  __person__."id"::text as "8";

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" desc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person__."email" as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."email" asc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person__."email" as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."email" desc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person__."email" as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."email" desc, __person__."id" desc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"c"."person" as "id0",
    (ids.value->>1)::"b"."email" as "id1"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    ("c"."person_exists"(
      __person__,
      __person_identifiers__."id1"
    ))::text as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from (select (__person_identifiers__."id0").*) as __person__
  order by __person__."id" asc
) as __person_result__;

insert into "c"."compound_key" as __compound_key__ ("person_id_2", "person_id_1", "extra") values ($1::"int4", $2::"int4", $3::"bool") returning
  __compound_key__."extra"::text as "0",
  __compound_key__."person_id_2"::text as "1",
  __compound_key__."person_id_1"::text as "2";

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__;

insert into "c"."edge_case" as __edge_case__ ("not_null_has_default") values ($1::"bool") returning
  __edge_case__."not_null_has_default"::text as "0";

insert into "c"."edge_case" as __edge_case__ default values returning
  __edge_case__."not_null_has_default"::text as "0";

insert into "c"."person" as __person__ ("id", "person_full_name", "about", "email", "config", "last_login_from_ip", "last_login_from_subnet", "user_mac") values ($1::"int4", $2::"varchar", $3::"text", $4::"b"."email", $5::"hstore", $6::"inet", $7::"cidr", $8::"macaddr") returning
  __person__::text as "0",
  __person__."user_mac"::text as "1",
  __person__."last_login_from_subnet"::text as "2",
  __person__."last_login_from_ip"::text as "3",
  __person__."config"::text as "4",
  __person__."about" as "5",
  __person__."email" as "6",
  __person__."person_full_name" as "7",
  __person__."id"::text as "8";

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" desc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person__."email" as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."email" asc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person__."email" as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."email" desc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    __person__."id"::text as "1",
    __person__."email" as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."email" desc, __person__."id" desc
) as __person_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"c"."person" as "id0",
    (ids.value->>1)::"b"."email" as "id1"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    ("c"."person_exists"(
      __person__,
      __person_identifiers__."id1"
    ))::text as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from (select (__person_identifiers__."id0").*) as __person__
  order by __person__."id" asc
) as __person_result__;

insert into "c"."person" as __person__ ("id", "person_full_name", "about", "email") values ($1::"int4", $2::"varchar", $3::"text", $4::"b"."email") returning
  __person__::text as "0";

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"c"."person" as "id0",
    (ids.value->>1)::"b"."email" as "id1"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    ("c"."person_exists"(
      __person__,
      __person_identifiers__."id1"
    ))::text as "0",
    __person__."id"::text as "1",
    __person_identifiers__.idx as "2"
  from (select (__person_identifiers__."id0").*) as __person__
  order by __person__."id" asc
) as __person_result__;

insert into "a"."default_value" as __default_value__ ("id", "null_value") values ($1::"int4", $2::"text") returning
  __default_value__."null_value" as "0",
  __default_value__."id"::text as "1";

insert into "a"."post" as __post__ ("headline", "comptypes") values ($1::"text", $2::"a"."comptype"[]) returning
  __post__."comptypes"::text as "0",
  __post__."headline" as "1",
  __post__."id"::text as "2";

select __frmcdc_comptype_1_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"a"."comptype"[] as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __frmcdc_comptype_1_identifiers__,
lateral (
  select
    __frmcdc_comptype_1__."is_optimised"::text as "0",
    to_char(__frmcdc_comptype_1__."schedule", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "1",
    (not (__frmcdc_comptype_1__ is null))::text as "2",
    __frmcdc_comptype_1_identifiers__.idx as "3"
  from unnest(__frmcdc_comptype_1_identifiers__."id0") as __frmcdc_comptype_1__
) as __frmcdc_comptype_1_result__;

insert into "a"."post" as __post__ ("headline", "author_id", "comptypes") values ($1::"text", $2::"int4", $3::"a"."comptype"[]) returning
  __post__."id"::text as "0",
  __post__."author_id"::text as "1",
  __post__."comptypes"::text as "2",
  __post__."headline" as "3";

select __post_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __post_identifiers__,
lateral (
  select
    __person__."person_full_name" as "0",
    (select json_agg(_) from (
      select
        __frmcdc_comptype_1__."is_optimised"::text as "0",
        to_char(__frmcdc_comptype_1__."schedule", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "1",
        (not (__frmcdc_comptype_1__ is null))::text as "2"
      from unnest(__post__."comptypes") as __frmcdc_comptype_1__
    ) _) as "1",
    __post__."headline" as "2",
    __post__."id"::text as "3",
    __post_identifiers__.idx as "4"
  from "a"."post" as __post__
  left outer join "c"."person" as __person__
  on (__post__."author_id"::"int4" = __person__."id")
  where (
    __post__."id" = __post_identifiers__."id0"
  )
  order by __post__."id" asc
) as __post_result__;

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    to_char(__person__."created_at", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "0",
    __person__."email" as "1",
    __person__."id"::text as "2",
    __person_identifiers__.idx as "3"
  from "c"."person" as __person__
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__;

select __frmcdc_comptype_1_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"a"."comptype"[] as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __frmcdc_comptype_1_identifiers__,
lateral (
  select
    __frmcdc_comptype_1__."is_optimised"::text as "0",
    to_char(__frmcdc_comptype_1__."schedule", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "1",
    (not (__frmcdc_comptype_1__ is null))::text as "2",
    __frmcdc_comptype_1_identifiers__.idx as "3"
  from unnest(__frmcdc_comptype_1_identifiers__."id0") as __frmcdc_comptype_1__
) as __frmcdc_comptype_1_result__;