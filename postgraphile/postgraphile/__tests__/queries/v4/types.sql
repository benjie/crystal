select
  __types__."bigint"::text as "0",
  __types__."numeric"::text as "1",
  __types__."decimal"::text as "2",
  __types__."boolean"::text as "3",
  __types__."varchar" as "4",
  __types__."enum"::text as "5",
  __types__."enum_array"::text as "6",
  __types__."domain"::text as "7",
  __types__."domain2"::text as "8",
  __types__."text_array"::text as "9",
  __types__."json"::text as "10",
  __types__."jsonb"::text as "11",
  __types__."nullable_range"::text as "12",
  __types__."numrange"::text as "13",
  json_build_array(
    lower_inc(__types__."daterange"),
    to_char(lower(__types__."daterange"), 'YYYY-MM-DD'::text),
    to_char(upper(__types__."daterange"), 'YYYY-MM-DD'::text),
    upper_inc(__types__."daterange")
  )::text as "14",
  __types__."an_int_range"::text as "15",
  to_char(__types__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "16",
  to_char(__types__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "17",
  to_char(__types__."date", 'YYYY-MM-DD'::text) as "18",
  to_char(date '1970-01-01' + __types__."time", 'HH24:MI:SS.US'::text) as "19",
  to_char(date '1970-01-01' + __types__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "20",
  to_char(__types__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "21",
  (
    select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
    from unnest(__types__."interval_array") t
  )::text as "22",
  __types__."money"::numeric::text as "23",
  __frmcdc_compound_type_1__."a"::text as "24",
  __frmcdc_compound_type_1__."b" as "25",
  __frmcdc_compound_type_1__."c"::text as "26",
  __frmcdc_compound_type_1__."d" as "27",
  __frmcdc_compound_type_1__."e"::text as "28",
  __frmcdc_compound_type_1__."f"::text as "29",
  __frmcdc_compound_type_1__."foo_bar"::text as "30",
  (not (__frmcdc_compound_type_1__ is null))::text as "31",
  __frmcdc_compound_type_1_2."a"::text as "32",
  __frmcdc_compound_type_1_2."b" as "33",
  __frmcdc_compound_type_1_2."c"::text as "34",
  __frmcdc_compound_type_1_2."d" as "35",
  __frmcdc_compound_type_1_2."e"::text as "36",
  __frmcdc_compound_type_1_2."f"::text as "37",
  __frmcdc_compound_type_1_2."foo_bar"::text as "38",
  (not (__frmcdc_compound_type_1_2 is null))::text as "39",
  __frmcdc_compound_type_1_3."a"::text as "40",
  __frmcdc_compound_type_1_3."b" as "41",
  __frmcdc_compound_type_1_3."c"::text as "42",
  __frmcdc_compound_type_1_3."d" as "43",
  __frmcdc_compound_type_1_3."e"::text as "44",
  __frmcdc_compound_type_1_3."f"::text as "45",
  __frmcdc_compound_type_1_3."foo_bar"::text as "46",
  (not (__frmcdc_compound_type_1_3 is null))::text as "47",
  __frmcdc_nested_compound_type_1__."baz_buz"::text as "48",
  (not (__frmcdc_nested_compound_type_1__ is null))::text as "49",
  __frmcdc_compound_type_1_4."a"::text as "50",
  __frmcdc_compound_type_1_4."b" as "51",
  __frmcdc_compound_type_1_4."c"::text as "52",
  __frmcdc_compound_type_1_4."d" as "53",
  __frmcdc_compound_type_1_4."e"::text as "54",
  __frmcdc_compound_type_1_4."f"::text as "55",
  __frmcdc_compound_type_1_4."foo_bar"::text as "56",
  (not (__frmcdc_compound_type_1_4 is null))::text as "57",
  __frmcdc_compound_type_1_5."a"::text as "58",
  __frmcdc_compound_type_1_5."b" as "59",
  __frmcdc_compound_type_1_5."c"::text as "60",
  __frmcdc_compound_type_1_5."d" as "61",
  __frmcdc_compound_type_1_5."e"::text as "62",
  __frmcdc_compound_type_1_5."f"::text as "63",
  __frmcdc_compound_type_1_5."foo_bar"::text as "64",
  (not (__frmcdc_compound_type_1_5 is null))::text as "65",
  __frmcdc_compound_type_1_6."a"::text as "66",
  __frmcdc_compound_type_1_6."b" as "67",
  __frmcdc_compound_type_1_6."c"::text as "68",
  __frmcdc_compound_type_1_6."d" as "69",
  __frmcdc_compound_type_1_6."e"::text as "70",
  __frmcdc_compound_type_1_6."f"::text as "71",
  __frmcdc_compound_type_1_6."foo_bar"::text as "72",
  (not (__frmcdc_compound_type_1_6 is null))::text as "73",
  __frmcdc_nested_compound_type_1_2."baz_buz"::text as "74",
  (not (__frmcdc_nested_compound_type_1_2 is null))::text as "75",
  __types__."point"::text as "76",
  __types__."nullablePoint"::text as "77",
  __types__."inet"::text as "78",
  __types__."cidr"::text as "79",
  __types__."macaddr"::text as "80",
  __types__."regproc"::text as "81",
  __types__."regprocedure"::text as "82",
  __types__."regoper"::text as "83",
  __types__."regoperator"::text as "84",
  __types__."regclass"::text as "85",
  __types__."regtype"::text as "86",
  __types__."regconfig"::text as "87",
  __types__."regdictionary"::text as "88",
  __types__."text_array_domain"::text as "89",
  __types__."int8_array_domain"::text as "90",
  __post__."id"::text as "91",
  __post__."headline" as "92",
  __types__."smallint"::text as "93",
  __post_2."id"::text as "94",
  __post_2."headline" as "95",
  __types__."id"::text as "96"
from "b"."types" as __types__
left outer join lateral (select (__types__."compound_type").*) as __frmcdc_compound_type_1__
on TRUE
left outer join lateral (select (__types__."nested_compound_type").*) as __frmcdc_nested_compound_type_1__
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1__."a").*) as __frmcdc_compound_type_1_2
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1__."b").*) as __frmcdc_compound_type_1_3
on TRUE
left outer join lateral (select (__types__."nullable_compound_type").*) as __frmcdc_compound_type_1_4
on TRUE
left outer join lateral (select (__types__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_2
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_2."a").*) as __frmcdc_compound_type_1_5
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_2."b").*) as __frmcdc_compound_type_1_6
on TRUE
left outer join "a"."post" as __post__
on (__types__."smallint"::"int4" = __post__."id")
left outer join "a"."post" as __post_2
on (__types__."id"::"int4" = __post_2."id")
order by __types__."id" asc;

select __types_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __types_identifiers__,
lateral (
  select
    __types__."bigint"::text as "0",
    __types__."numeric"::text as "1",
    __types__."decimal"::text as "2",
    __types__."boolean"::text as "3",
    __types__."varchar" as "4",
    __types__."enum"::text as "5",
    __types__."enum_array"::text as "6",
    __types__."domain"::text as "7",
    __types__."domain2"::text as "8",
    __types__."text_array"::text as "9",
    __types__."json"::text as "10",
    __types__."jsonb"::text as "11",
    __types__."nullable_range"::text as "12",
    __types__."numrange"::text as "13",
    json_build_array(
      lower_inc(__types__."daterange"),
      to_char(lower(__types__."daterange"), 'YYYY-MM-DD'::text),
      to_char(upper(__types__."daterange"), 'YYYY-MM-DD'::text),
      upper_inc(__types__."daterange")
    )::text as "14",
    __types__."an_int_range"::text as "15",
    to_char(__types__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "16",
    to_char(__types__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "17",
    to_char(__types__."date", 'YYYY-MM-DD'::text) as "18",
    to_char(date '1970-01-01' + __types__."time", 'HH24:MI:SS.US'::text) as "19",
    to_char(date '1970-01-01' + __types__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "20",
    to_char(__types__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "21",
    (
      select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
      from unnest(__types__."interval_array") t
    )::text as "22",
    __types__."money"::numeric::text as "23",
    __frmcdc_compound_type_1__."a"::text as "24",
    __frmcdc_compound_type_1__."b" as "25",
    __frmcdc_compound_type_1__."c"::text as "26",
    __frmcdc_compound_type_1__."d" as "27",
    __frmcdc_compound_type_1__."e"::text as "28",
    __frmcdc_compound_type_1__."f"::text as "29",
    __frmcdc_compound_type_1__."foo_bar"::text as "30",
    (not (__frmcdc_compound_type_1__ is null))::text as "31",
    __frmcdc_compound_type_1_2."a"::text as "32",
    __frmcdc_compound_type_1_2."b" as "33",
    __frmcdc_compound_type_1_2."c"::text as "34",
    __frmcdc_compound_type_1_2."d" as "35",
    __frmcdc_compound_type_1_2."e"::text as "36",
    __frmcdc_compound_type_1_2."f"::text as "37",
    __frmcdc_compound_type_1_2."foo_bar"::text as "38",
    (not (__frmcdc_compound_type_1_2 is null))::text as "39",
    __frmcdc_compound_type_1_3."a"::text as "40",
    __frmcdc_compound_type_1_3."b" as "41",
    __frmcdc_compound_type_1_3."c"::text as "42",
    __frmcdc_compound_type_1_3."d" as "43",
    __frmcdc_compound_type_1_3."e"::text as "44",
    __frmcdc_compound_type_1_3."f"::text as "45",
    __frmcdc_compound_type_1_3."foo_bar"::text as "46",
    (not (__frmcdc_compound_type_1_3 is null))::text as "47",
    __frmcdc_nested_compound_type_1__."baz_buz"::text as "48",
    (not (__frmcdc_nested_compound_type_1__ is null))::text as "49",
    __frmcdc_compound_type_1_4."a"::text as "50",
    __frmcdc_compound_type_1_4."b" as "51",
    __frmcdc_compound_type_1_4."c"::text as "52",
    __frmcdc_compound_type_1_4."d" as "53",
    __frmcdc_compound_type_1_4."e"::text as "54",
    __frmcdc_compound_type_1_4."f"::text as "55",
    __frmcdc_compound_type_1_4."foo_bar"::text as "56",
    (not (__frmcdc_compound_type_1_4 is null))::text as "57",
    __frmcdc_compound_type_1_5."a"::text as "58",
    __frmcdc_compound_type_1_5."b" as "59",
    __frmcdc_compound_type_1_5."c"::text as "60",
    __frmcdc_compound_type_1_5."d" as "61",
    __frmcdc_compound_type_1_5."e"::text as "62",
    __frmcdc_compound_type_1_5."f"::text as "63",
    __frmcdc_compound_type_1_5."foo_bar"::text as "64",
    (not (__frmcdc_compound_type_1_5 is null))::text as "65",
    __frmcdc_compound_type_1_6."a"::text as "66",
    __frmcdc_compound_type_1_6."b" as "67",
    __frmcdc_compound_type_1_6."c"::text as "68",
    __frmcdc_compound_type_1_6."d" as "69",
    __frmcdc_compound_type_1_6."e"::text as "70",
    __frmcdc_compound_type_1_6."f"::text as "71",
    __frmcdc_compound_type_1_6."foo_bar"::text as "72",
    (not (__frmcdc_compound_type_1_6 is null))::text as "73",
    __frmcdc_nested_compound_type_1_2."baz_buz"::text as "74",
    (not (__frmcdc_nested_compound_type_1_2 is null))::text as "75",
    __types__."point"::text as "76",
    __types__."nullablePoint"::text as "77",
    __types__."inet"::text as "78",
    __types__."cidr"::text as "79",
    __types__."macaddr"::text as "80",
    __types__."regproc"::text as "81",
    __types__."regprocedure"::text as "82",
    __types__."regoper"::text as "83",
    __types__."regoperator"::text as "84",
    __types__."regclass"::text as "85",
    __types__."regtype"::text as "86",
    __types__."regconfig"::text as "87",
    __types__."regdictionary"::text as "88",
    __types__."text_array_domain"::text as "89",
    __types__."int8_array_domain"::text as "90",
    __post__."id"::text as "91",
    __post__."headline" as "92",
    __types__."smallint"::text as "93",
    __post_2."id"::text as "94",
    __post_2."headline" as "95",
    __types__."id"::text as "96",
    __types_identifiers__.idx as "97"
  from "b"."types" as __types__
  left outer join lateral (select (__types__."compound_type").*) as __frmcdc_compound_type_1__
  on TRUE
  left outer join lateral (select (__types__."nested_compound_type").*) as __frmcdc_nested_compound_type_1__
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1__."a").*) as __frmcdc_compound_type_1_2
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1__."b").*) as __frmcdc_compound_type_1_3
  on TRUE
  left outer join lateral (select (__types__."nullable_compound_type").*) as __frmcdc_compound_type_1_4
  on TRUE
  left outer join lateral (select (__types__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_2
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_2."a").*) as __frmcdc_compound_type_1_5
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_2."b").*) as __frmcdc_compound_type_1_6
  on TRUE
  left outer join "a"."post" as __post__
  on (__types__."smallint"::"int4" = __post__."id")
  left outer join "a"."post" as __post_2
  on (__types__."id"::"int4" = __post_2."id")
  where (
    __types__."id" = __types_identifiers__."id0"
  )
  order by __types__."id" asc
) as __types_result__;

select __type_function_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __type_function_identifiers__,
lateral (
  select
    __type_function__."bigint"::text as "0",
    __type_function__."numeric"::text as "1",
    __type_function__."decimal"::text as "2",
    __type_function__."boolean"::text as "3",
    __type_function__."varchar" as "4",
    __type_function__."enum"::text as "5",
    __type_function__."enum_array"::text as "6",
    __type_function__."domain"::text as "7",
    __type_function__."domain2"::text as "8",
    __type_function__."text_array"::text as "9",
    __type_function__."json"::text as "10",
    __type_function__."jsonb"::text as "11",
    __type_function__."nullable_range"::text as "12",
    __type_function__."numrange"::text as "13",
    json_build_array(
      lower_inc(__type_function__."daterange"),
      to_char(lower(__type_function__."daterange"), 'YYYY-MM-DD'::text),
      to_char(upper(__type_function__."daterange"), 'YYYY-MM-DD'::text),
      upper_inc(__type_function__."daterange")
    )::text as "14",
    __type_function__."an_int_range"::text as "15",
    to_char(__type_function__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "16",
    to_char(__type_function__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "17",
    to_char(__type_function__."date", 'YYYY-MM-DD'::text) as "18",
    to_char(date '1970-01-01' + __type_function__."time", 'HH24:MI:SS.US'::text) as "19",
    to_char(date '1970-01-01' + __type_function__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "20",
    to_char(__type_function__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "21",
    (
      select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
      from unnest(__type_function__."interval_array") t
    )::text as "22",
    __type_function__."money"::numeric::text as "23",
    __frmcdc_compound_type_1__."a"::text as "24",
    __frmcdc_compound_type_1__."b" as "25",
    __frmcdc_compound_type_1__."c"::text as "26",
    __frmcdc_compound_type_1__."d" as "27",
    __frmcdc_compound_type_1__."e"::text as "28",
    __frmcdc_compound_type_1__."f"::text as "29",
    __frmcdc_compound_type_1__."foo_bar"::text as "30",
    (not (__frmcdc_compound_type_1__ is null))::text as "31",
    __frmcdc_compound_type_1_2."a"::text as "32",
    __frmcdc_compound_type_1_2."b" as "33",
    __frmcdc_compound_type_1_2."c"::text as "34",
    __frmcdc_compound_type_1_2."d" as "35",
    __frmcdc_compound_type_1_2."e"::text as "36",
    __frmcdc_compound_type_1_2."f"::text as "37",
    __frmcdc_compound_type_1_2."foo_bar"::text as "38",
    (not (__frmcdc_compound_type_1_2 is null))::text as "39",
    __frmcdc_compound_type_1_3."a"::text as "40",
    __frmcdc_compound_type_1_3."b" as "41",
    __frmcdc_compound_type_1_3."c"::text as "42",
    __frmcdc_compound_type_1_3."d" as "43",
    __frmcdc_compound_type_1_3."e"::text as "44",
    __frmcdc_compound_type_1_3."f"::text as "45",
    __frmcdc_compound_type_1_3."foo_bar"::text as "46",
    (not (__frmcdc_compound_type_1_3 is null))::text as "47",
    __frmcdc_nested_compound_type_1__."baz_buz"::text as "48",
    (not (__frmcdc_nested_compound_type_1__ is null))::text as "49",
    __frmcdc_compound_type_1_4."a"::text as "50",
    __frmcdc_compound_type_1_4."b" as "51",
    __frmcdc_compound_type_1_4."c"::text as "52",
    __frmcdc_compound_type_1_4."d" as "53",
    __frmcdc_compound_type_1_4."e"::text as "54",
    __frmcdc_compound_type_1_4."f"::text as "55",
    __frmcdc_compound_type_1_4."foo_bar"::text as "56",
    (not (__frmcdc_compound_type_1_4 is null))::text as "57",
    __frmcdc_compound_type_1_5."a"::text as "58",
    __frmcdc_compound_type_1_5."b" as "59",
    __frmcdc_compound_type_1_5."c"::text as "60",
    __frmcdc_compound_type_1_5."d" as "61",
    __frmcdc_compound_type_1_5."e"::text as "62",
    __frmcdc_compound_type_1_5."f"::text as "63",
    __frmcdc_compound_type_1_5."foo_bar"::text as "64",
    (not (__frmcdc_compound_type_1_5 is null))::text as "65",
    __frmcdc_compound_type_1_6."a"::text as "66",
    __frmcdc_compound_type_1_6."b" as "67",
    __frmcdc_compound_type_1_6."c"::text as "68",
    __frmcdc_compound_type_1_6."d" as "69",
    __frmcdc_compound_type_1_6."e"::text as "70",
    __frmcdc_compound_type_1_6."f"::text as "71",
    __frmcdc_compound_type_1_6."foo_bar"::text as "72",
    (not (__frmcdc_compound_type_1_6 is null))::text as "73",
    __frmcdc_nested_compound_type_1_2."baz_buz"::text as "74",
    (not (__frmcdc_nested_compound_type_1_2 is null))::text as "75",
    __type_function__."point"::text as "76",
    __type_function__."nullablePoint"::text as "77",
    __type_function__."inet"::text as "78",
    __type_function__."cidr"::text as "79",
    __type_function__."macaddr"::text as "80",
    __type_function__."regproc"::text as "81",
    __type_function__."regprocedure"::text as "82",
    __type_function__."regoper"::text as "83",
    __type_function__."regoperator"::text as "84",
    __type_function__."regclass"::text as "85",
    __type_function__."regtype"::text as "86",
    __type_function__."regconfig"::text as "87",
    __type_function__."regdictionary"::text as "88",
    __type_function__."text_array_domain"::text as "89",
    __type_function__."int8_array_domain"::text as "90",
    __post__."id"::text as "91",
    __post__."headline" as "92",
    __type_function__."smallint"::text as "93",
    __post_2."id"::text as "94",
    __post_2."headline" as "95",
    __type_function__."id"::text as "96",
    __type_function_identifiers__.idx as "97"
  from "b"."type_function"(__type_function_identifiers__."id0") as __type_function__
  left outer join lateral (select (__type_function__."compound_type").*) as __frmcdc_compound_type_1__
  on TRUE
  left outer join lateral (select (__type_function__."nested_compound_type").*) as __frmcdc_nested_compound_type_1__
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1__."a").*) as __frmcdc_compound_type_1_2
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1__."b").*) as __frmcdc_compound_type_1_3
  on TRUE
  left outer join lateral (select (__type_function__."nullable_compound_type").*) as __frmcdc_compound_type_1_4
  on TRUE
  left outer join lateral (select (__type_function__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_2
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_2."a").*) as __frmcdc_compound_type_1_5
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_2."b").*) as __frmcdc_compound_type_1_6
  on TRUE
  left outer join "a"."post" as __post__
  on (__type_function__."smallint"::"int4" = __post__."id")
  left outer join "a"."post" as __post_2
  on (__type_function__."id"::"int4" = __post_2."id")
) as __type_function_result__;

select
  __type_function_list__."bigint"::text as "0",
  __type_function_list__."numeric"::text as "1",
  __type_function_list__."decimal"::text as "2",
  __type_function_list__."boolean"::text as "3",
  __type_function_list__."varchar" as "4",
  __type_function_list__."enum"::text as "5",
  __type_function_list__."enum_array"::text as "6",
  __type_function_list__."domain"::text as "7",
  __type_function_list__."domain2"::text as "8",
  __type_function_list__."text_array"::text as "9",
  __type_function_list__."json"::text as "10",
  __type_function_list__."jsonb"::text as "11",
  __type_function_list__."nullable_range"::text as "12",
  __type_function_list__."numrange"::text as "13",
  json_build_array(
    lower_inc(__type_function_list__."daterange"),
    to_char(lower(__type_function_list__."daterange"), 'YYYY-MM-DD'::text),
    to_char(upper(__type_function_list__."daterange"), 'YYYY-MM-DD'::text),
    upper_inc(__type_function_list__."daterange")
  )::text as "14",
  __type_function_list__."an_int_range"::text as "15",
  to_char(__type_function_list__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "16",
  to_char(__type_function_list__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "17",
  to_char(__type_function_list__."date", 'YYYY-MM-DD'::text) as "18",
  to_char(date '1970-01-01' + __type_function_list__."time", 'HH24:MI:SS.US'::text) as "19",
  to_char(date '1970-01-01' + __type_function_list__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "20",
  to_char(__type_function_list__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "21",
  (
    select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
    from unnest(__type_function_list__."interval_array") t
  )::text as "22",
  __type_function_list__."money"::numeric::text as "23",
  __frmcdc_compound_type_1__."a"::text as "24",
  __frmcdc_compound_type_1__."b" as "25",
  __frmcdc_compound_type_1__."c"::text as "26",
  __frmcdc_compound_type_1__."d" as "27",
  __frmcdc_compound_type_1__."e"::text as "28",
  __frmcdc_compound_type_1__."f"::text as "29",
  __frmcdc_compound_type_1__."foo_bar"::text as "30",
  (not (__frmcdc_compound_type_1__ is null))::text as "31",
  __frmcdc_compound_type_1_2."a"::text as "32",
  __frmcdc_compound_type_1_2."b" as "33",
  __frmcdc_compound_type_1_2."c"::text as "34",
  __frmcdc_compound_type_1_2."d" as "35",
  __frmcdc_compound_type_1_2."e"::text as "36",
  __frmcdc_compound_type_1_2."f"::text as "37",
  __frmcdc_compound_type_1_2."foo_bar"::text as "38",
  (not (__frmcdc_compound_type_1_2 is null))::text as "39",
  __frmcdc_compound_type_1_3."a"::text as "40",
  __frmcdc_compound_type_1_3."b" as "41",
  __frmcdc_compound_type_1_3."c"::text as "42",
  __frmcdc_compound_type_1_3."d" as "43",
  __frmcdc_compound_type_1_3."e"::text as "44",
  __frmcdc_compound_type_1_3."f"::text as "45",
  __frmcdc_compound_type_1_3."foo_bar"::text as "46",
  (not (__frmcdc_compound_type_1_3 is null))::text as "47",
  __frmcdc_nested_compound_type_1__."baz_buz"::text as "48",
  (not (__frmcdc_nested_compound_type_1__ is null))::text as "49",
  __frmcdc_compound_type_1_4."a"::text as "50",
  __frmcdc_compound_type_1_4."b" as "51",
  __frmcdc_compound_type_1_4."c"::text as "52",
  __frmcdc_compound_type_1_4."d" as "53",
  __frmcdc_compound_type_1_4."e"::text as "54",
  __frmcdc_compound_type_1_4."f"::text as "55",
  __frmcdc_compound_type_1_4."foo_bar"::text as "56",
  (not (__frmcdc_compound_type_1_4 is null))::text as "57",
  __frmcdc_compound_type_1_5."a"::text as "58",
  __frmcdc_compound_type_1_5."b" as "59",
  __frmcdc_compound_type_1_5."c"::text as "60",
  __frmcdc_compound_type_1_5."d" as "61",
  __frmcdc_compound_type_1_5."e"::text as "62",
  __frmcdc_compound_type_1_5."f"::text as "63",
  __frmcdc_compound_type_1_5."foo_bar"::text as "64",
  (not (__frmcdc_compound_type_1_5 is null))::text as "65",
  __frmcdc_compound_type_1_6."a"::text as "66",
  __frmcdc_compound_type_1_6."b" as "67",
  __frmcdc_compound_type_1_6."c"::text as "68",
  __frmcdc_compound_type_1_6."d" as "69",
  __frmcdc_compound_type_1_6."e"::text as "70",
  __frmcdc_compound_type_1_6."f"::text as "71",
  __frmcdc_compound_type_1_6."foo_bar"::text as "72",
  (not (__frmcdc_compound_type_1_6 is null))::text as "73",
  __frmcdc_nested_compound_type_1_2."baz_buz"::text as "74",
  (not (__frmcdc_nested_compound_type_1_2 is null))::text as "75",
  __type_function_list__."point"::text as "76",
  __type_function_list__."nullablePoint"::text as "77",
  __type_function_list__."inet"::text as "78",
  __type_function_list__."cidr"::text as "79",
  __type_function_list__."macaddr"::text as "80",
  __type_function_list__."regproc"::text as "81",
  __type_function_list__."regprocedure"::text as "82",
  __type_function_list__."regoper"::text as "83",
  __type_function_list__."regoperator"::text as "84",
  __type_function_list__."regclass"::text as "85",
  __type_function_list__."regtype"::text as "86",
  __type_function_list__."regconfig"::text as "87",
  __type_function_list__."regdictionary"::text as "88",
  __type_function_list__."text_array_domain"::text as "89",
  __type_function_list__."int8_array_domain"::text as "90",
  __post__."id"::text as "91",
  __post__."headline" as "92",
  __type_function_list__."smallint"::text as "93",
  __post_2."id"::text as "94",
  __post_2."headline" as "95",
  __type_function_list__."id"::text as "96"
from unnest("b"."type_function_list"()) as __type_function_list__
left outer join lateral (select (__type_function_list__."compound_type").*) as __frmcdc_compound_type_1__
on TRUE
left outer join lateral (select (__type_function_list__."nested_compound_type").*) as __frmcdc_nested_compound_type_1__
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1__."a").*) as __frmcdc_compound_type_1_2
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1__."b").*) as __frmcdc_compound_type_1_3
on TRUE
left outer join lateral (select (__type_function_list__."nullable_compound_type").*) as __frmcdc_compound_type_1_4
on TRUE
left outer join lateral (select (__type_function_list__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_2
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_2."a").*) as __frmcdc_compound_type_1_5
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_2."b").*) as __frmcdc_compound_type_1_6
on TRUE
left outer join "a"."post" as __post__
on (__type_function_list__."smallint"::"int4" = __post__."id")
left outer join "a"."post" as __post_2
on (__type_function_list__."id"::"int4" = __post_2."id");

select __person_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0",
    (ids.value->>1)::"int4" as "id1"
  from json_array_elements($1::json) with ordinality as ids
) as __person_identifiers__,
lateral (
  select
    (select json_agg(_) from (
      select
        (count(*))::text as "0"
      from "c"."person_type_function_connection"(__person__) as __person_type_function_connection__
    ) _) as "0",
    (select json_agg(_) from (
      select
        (row_number() over (partition by 1))::text as "0",
        __person_type_function_connection__."id"::text as "1",
        __post__."headline" as "2",
        __post__."id"::text as "3",
        __post_2."headline" as "4",
        __post_2."id"::text as "5",
        __person_type_function_connection__."smallint"::text as "6",
        __person_type_function_connection__."int8_array_domain"::text as "7",
        __person_type_function_connection__."text_array_domain"::text as "8",
        __person_type_function_connection__."regdictionary"::text as "9",
        __person_type_function_connection__."regconfig"::text as "10",
        __person_type_function_connection__."regtype"::text as "11",
        __person_type_function_connection__."regclass"::text as "12",
        __person_type_function_connection__."regoperator"::text as "13",
        __person_type_function_connection__."regoper"::text as "14",
        __person_type_function_connection__."regprocedure"::text as "15",
        __person_type_function_connection__."regproc"::text as "16",
        __person_type_function_connection__."macaddr"::text as "17",
        __person_type_function_connection__."cidr"::text as "18",
        __person_type_function_connection__."inet"::text as "19",
        __person_type_function_connection__."nullablePoint"::text as "20",
        __person_type_function_connection__."point"::text as "21",
        __frmcdc_nested_compound_type_1__."baz_buz"::text as "22",
        __frmcdc_compound_type_1__."foo_bar"::text as "23",
        __frmcdc_compound_type_1__."f"::text as "24",
        __frmcdc_compound_type_1__."e"::text as "25",
        __frmcdc_compound_type_1__."d" as "26",
        __frmcdc_compound_type_1__."c"::text as "27",
        __frmcdc_compound_type_1__."b" as "28",
        __frmcdc_compound_type_1__."a"::text as "29",
        (not (__frmcdc_compound_type_1__ is null))::text as "30",
        __frmcdc_compound_type_1_2."foo_bar"::text as "31",
        __frmcdc_compound_type_1_2."f"::text as "32",
        __frmcdc_compound_type_1_2."e"::text as "33",
        __frmcdc_compound_type_1_2."d" as "34",
        __frmcdc_compound_type_1_2."c"::text as "35",
        __frmcdc_compound_type_1_2."b" as "36",
        __frmcdc_compound_type_1_2."a"::text as "37",
        (not (__frmcdc_compound_type_1_2 is null))::text as "38",
        (not (__frmcdc_nested_compound_type_1__ is null))::text as "39",
        __frmcdc_compound_type_1_3."foo_bar"::text as "40",
        __frmcdc_compound_type_1_3."f"::text as "41",
        __frmcdc_compound_type_1_3."e"::text as "42",
        __frmcdc_compound_type_1_3."d" as "43",
        __frmcdc_compound_type_1_3."c"::text as "44",
        __frmcdc_compound_type_1_3."b" as "45",
        __frmcdc_compound_type_1_3."a"::text as "46",
        (not (__frmcdc_compound_type_1_3 is null))::text as "47",
        __frmcdc_nested_compound_type_1_2."baz_buz"::text as "48",
        __frmcdc_compound_type_1_4."foo_bar"::text as "49",
        __frmcdc_compound_type_1_4."f"::text as "50",
        __frmcdc_compound_type_1_4."e"::text as "51",
        __frmcdc_compound_type_1_4."d" as "52",
        __frmcdc_compound_type_1_4."c"::text as "53",
        __frmcdc_compound_type_1_4."b" as "54",
        __frmcdc_compound_type_1_4."a"::text as "55",
        (not (__frmcdc_compound_type_1_4 is null))::text as "56",
        __frmcdc_compound_type_1_5."foo_bar"::text as "57",
        __frmcdc_compound_type_1_5."f"::text as "58",
        __frmcdc_compound_type_1_5."e"::text as "59",
        __frmcdc_compound_type_1_5."d" as "60",
        __frmcdc_compound_type_1_5."c"::text as "61",
        __frmcdc_compound_type_1_5."b" as "62",
        __frmcdc_compound_type_1_5."a"::text as "63",
        (not (__frmcdc_compound_type_1_5 is null))::text as "64",
        (not (__frmcdc_nested_compound_type_1_2 is null))::text as "65",
        __frmcdc_compound_type_1_6."foo_bar"::text as "66",
        __frmcdc_compound_type_1_6."f"::text as "67",
        __frmcdc_compound_type_1_6."e"::text as "68",
        __frmcdc_compound_type_1_6."d" as "69",
        __frmcdc_compound_type_1_6."c"::text as "70",
        __frmcdc_compound_type_1_6."b" as "71",
        __frmcdc_compound_type_1_6."a"::text as "72",
        (not (__frmcdc_compound_type_1_6 is null))::text as "73",
        __person_type_function_connection__."money"::numeric::text as "74",
        (
          select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
          from unnest(__person_type_function_connection__."interval_array") t
        )::text as "75",
        to_char(__person_type_function_connection__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "76",
        to_char(date '1970-01-01' + __person_type_function_connection__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "77",
        to_char(date '1970-01-01' + __person_type_function_connection__."time", 'HH24:MI:SS.US'::text) as "78",
        to_char(__person_type_function_connection__."date", 'YYYY-MM-DD'::text) as "79",
        to_char(__person_type_function_connection__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "80",
        to_char(__person_type_function_connection__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "81",
        __person_type_function_connection__."an_int_range"::text as "82",
        json_build_array(
          lower_inc(__person_type_function_connection__."daterange"),
          to_char(lower(__person_type_function_connection__."daterange"), 'YYYY-MM-DD'::text),
          to_char(upper(__person_type_function_connection__."daterange"), 'YYYY-MM-DD'::text),
          upper_inc(__person_type_function_connection__."daterange")
        )::text as "83",
        __person_type_function_connection__."numrange"::text as "84",
        __person_type_function_connection__."nullable_range"::text as "85",
        __person_type_function_connection__."jsonb"::text as "86",
        __person_type_function_connection__."json"::text as "87",
        __person_type_function_connection__."text_array"::text as "88",
        __person_type_function_connection__."domain2"::text as "89",
        __person_type_function_connection__."domain"::text as "90",
        __person_type_function_connection__."enum_array"::text as "91",
        __person_type_function_connection__."enum"::text as "92",
        __person_type_function_connection__."varchar" as "93",
        __person_type_function_connection__."boolean"::text as "94",
        __person_type_function_connection__."decimal"::text as "95",
        __person_type_function_connection__."numeric"::text as "96",
        __person_type_function_connection__."bigint"::text as "97",
        __post_3."headline" as "98",
        __post_3."id"::text as "99",
        __post_4."headline" as "100",
        __post_4."id"::text as "101",
        __frmcdc_nested_compound_type_1_3."baz_buz"::text as "102",
        __frmcdc_compound_type_1_7."foo_bar"::text as "103",
        __frmcdc_compound_type_1_7."f"::text as "104",
        __frmcdc_compound_type_1_7."e"::text as "105",
        __frmcdc_compound_type_1_7."d" as "106",
        __frmcdc_compound_type_1_7."c"::text as "107",
        __frmcdc_compound_type_1_7."b" as "108",
        __frmcdc_compound_type_1_7."a"::text as "109",
        (not (__frmcdc_compound_type_1_7 is null))::text as "110",
        __frmcdc_compound_type_1_8."foo_bar"::text as "111",
        __frmcdc_compound_type_1_8."f"::text as "112",
        __frmcdc_compound_type_1_8."e"::text as "113",
        __frmcdc_compound_type_1_8."d" as "114",
        __frmcdc_compound_type_1_8."c"::text as "115",
        __frmcdc_compound_type_1_8."b" as "116",
        __frmcdc_compound_type_1_8."a"::text as "117",
        (not (__frmcdc_compound_type_1_8 is null))::text as "118",
        (not (__frmcdc_nested_compound_type_1_3 is null))::text as "119",
        __frmcdc_compound_type_1_9."foo_bar"::text as "120",
        __frmcdc_compound_type_1_9."f"::text as "121",
        __frmcdc_compound_type_1_9."e"::text as "122",
        __frmcdc_compound_type_1_9."d" as "123",
        __frmcdc_compound_type_1_9."c"::text as "124",
        __frmcdc_compound_type_1_9."b" as "125",
        __frmcdc_compound_type_1_9."a"::text as "126",
        (not (__frmcdc_compound_type_1_9 is null))::text as "127",
        __frmcdc_nested_compound_type_1_4."baz_buz"::text as "128",
        __frmcdc_compound_type_1_10."foo_bar"::text as "129",
        __frmcdc_compound_type_1_10."f"::text as "130",
        __frmcdc_compound_type_1_10."e"::text as "131",
        __frmcdc_compound_type_1_10."d" as "132",
        __frmcdc_compound_type_1_10."c"::text as "133",
        __frmcdc_compound_type_1_10."b" as "134",
        __frmcdc_compound_type_1_10."a"::text as "135",
        (not (__frmcdc_compound_type_1_10 is null))::text as "136",
        __frmcdc_compound_type_1_11."foo_bar"::text as "137",
        __frmcdc_compound_type_1_11."f"::text as "138",
        __frmcdc_compound_type_1_11."e"::text as "139",
        __frmcdc_compound_type_1_11."d" as "140",
        __frmcdc_compound_type_1_11."c"::text as "141",
        __frmcdc_compound_type_1_11."b" as "142",
        __frmcdc_compound_type_1_11."a"::text as "143",
        (not (__frmcdc_compound_type_1_11 is null))::text as "144",
        (not (__frmcdc_nested_compound_type_1_4 is null))::text as "145",
        __frmcdc_compound_type_1_12."foo_bar"::text as "146",
        __frmcdc_compound_type_1_12."f"::text as "147",
        __frmcdc_compound_type_1_12."e"::text as "148",
        __frmcdc_compound_type_1_12."d" as "149",
        __frmcdc_compound_type_1_12."c"::text as "150",
        __frmcdc_compound_type_1_12."b" as "151",
        __frmcdc_compound_type_1_12."a"::text as "152",
        (not (__frmcdc_compound_type_1_12 is null))::text as "153"
      from "c"."person_type_function_connection"(__person__) as __person_type_function_connection__
      left outer join "a"."post" as __post__
      on (__person_type_function_connection__."id"::"int4" = __post__."id")
      left outer join "a"."post" as __post_2
      on (__person_type_function_connection__."smallint"::"int4" = __post_2."id")
      left outer join lateral (select (__person_type_function_connection__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1__
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1__."b").*) as __frmcdc_compound_type_1__
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1__."a").*) as __frmcdc_compound_type_1_2
      on TRUE
      left outer join lateral (select (__person_type_function_connection__."nullable_compound_type").*) as __frmcdc_compound_type_1_3
      on TRUE
      left outer join lateral (select (__person_type_function_connection__."nested_compound_type").*) as __frmcdc_nested_compound_type_1_2
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_2."b").*) as __frmcdc_compound_type_1_4
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_2."a").*) as __frmcdc_compound_type_1_5
      on TRUE
      left outer join lateral (select (__person_type_function_connection__."compound_type").*) as __frmcdc_compound_type_1_6
      on TRUE
      left outer join "a"."post" as __post_3
      on (__person_type_function_connection__."id"::"int4" = __post_3."id")
      left outer join "a"."post" as __post_4
      on (__person_type_function_connection__."smallint"::"int4" = __post_4."id")
      left outer join lateral (select (__person_type_function_connection__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_3
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_3."b").*) as __frmcdc_compound_type_1_7
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_3."a").*) as __frmcdc_compound_type_1_8
      on TRUE
      left outer join lateral (select (__person_type_function_connection__."nullable_compound_type").*) as __frmcdc_compound_type_1_9
      on TRUE
      left outer join lateral (select (__person_type_function_connection__."nested_compound_type").*) as __frmcdc_nested_compound_type_1_4
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_4."b").*) as __frmcdc_compound_type_1_10
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_4."a").*) as __frmcdc_compound_type_1_11
      on TRUE
      left outer join lateral (select (__person_type_function_connection__."compound_type").*) as __frmcdc_compound_type_1_12
      on TRUE
    ) _) as "1",
    (select json_agg(_) from (
      select
        __post_5."headline" as "0",
        __post_5."id"::text as "1",
        __person_type_function_list__."id"::text as "2",
        __post_6."headline" as "3",
        __post_6."id"::text as "4",
        __person_type_function_list__."smallint"::text as "5",
        __person_type_function_list__."int8_array_domain"::text as "6",
        __person_type_function_list__."text_array_domain"::text as "7",
        __person_type_function_list__."regdictionary"::text as "8",
        __person_type_function_list__."regconfig"::text as "9",
        __person_type_function_list__."regtype"::text as "10",
        __person_type_function_list__."regclass"::text as "11",
        __person_type_function_list__."regoperator"::text as "12",
        __person_type_function_list__."regoper"::text as "13",
        __person_type_function_list__."regprocedure"::text as "14",
        __person_type_function_list__."regproc"::text as "15",
        __person_type_function_list__."macaddr"::text as "16",
        __person_type_function_list__."cidr"::text as "17",
        __person_type_function_list__."inet"::text as "18",
        __person_type_function_list__."nullablePoint"::text as "19",
        __person_type_function_list__."point"::text as "20",
        __frmcdc_nested_compound_type_1_5."baz_buz"::text as "21",
        __frmcdc_compound_type_1_13."foo_bar"::text as "22",
        __frmcdc_compound_type_1_13."f"::text as "23",
        __frmcdc_compound_type_1_13."e"::text as "24",
        __frmcdc_compound_type_1_13."d" as "25",
        __frmcdc_compound_type_1_13."c"::text as "26",
        __frmcdc_compound_type_1_13."b" as "27",
        __frmcdc_compound_type_1_13."a"::text as "28",
        (not (__frmcdc_compound_type_1_13 is null))::text as "29",
        __frmcdc_compound_type_1_14."foo_bar"::text as "30",
        __frmcdc_compound_type_1_14."f"::text as "31",
        __frmcdc_compound_type_1_14."e"::text as "32",
        __frmcdc_compound_type_1_14."d" as "33",
        __frmcdc_compound_type_1_14."c"::text as "34",
        __frmcdc_compound_type_1_14."b" as "35",
        __frmcdc_compound_type_1_14."a"::text as "36",
        (not (__frmcdc_compound_type_1_14 is null))::text as "37",
        (not (__frmcdc_nested_compound_type_1_5 is null))::text as "38",
        __frmcdc_compound_type_1_15."foo_bar"::text as "39",
        __frmcdc_compound_type_1_15."f"::text as "40",
        __frmcdc_compound_type_1_15."e"::text as "41",
        __frmcdc_compound_type_1_15."d" as "42",
        __frmcdc_compound_type_1_15."c"::text as "43",
        __frmcdc_compound_type_1_15."b" as "44",
        __frmcdc_compound_type_1_15."a"::text as "45",
        (not (__frmcdc_compound_type_1_15 is null))::text as "46",
        __frmcdc_nested_compound_type_1_6."baz_buz"::text as "47",
        __frmcdc_compound_type_1_16."foo_bar"::text as "48",
        __frmcdc_compound_type_1_16."f"::text as "49",
        __frmcdc_compound_type_1_16."e"::text as "50",
        __frmcdc_compound_type_1_16."d" as "51",
        __frmcdc_compound_type_1_16."c"::text as "52",
        __frmcdc_compound_type_1_16."b" as "53",
        __frmcdc_compound_type_1_16."a"::text as "54",
        (not (__frmcdc_compound_type_1_16 is null))::text as "55",
        __frmcdc_compound_type_1_17."foo_bar"::text as "56",
        __frmcdc_compound_type_1_17."f"::text as "57",
        __frmcdc_compound_type_1_17."e"::text as "58",
        __frmcdc_compound_type_1_17."d" as "59",
        __frmcdc_compound_type_1_17."c"::text as "60",
        __frmcdc_compound_type_1_17."b" as "61",
        __frmcdc_compound_type_1_17."a"::text as "62",
        (not (__frmcdc_compound_type_1_17 is null))::text as "63",
        (not (__frmcdc_nested_compound_type_1_6 is null))::text as "64",
        __frmcdc_compound_type_1_18."foo_bar"::text as "65",
        __frmcdc_compound_type_1_18."f"::text as "66",
        __frmcdc_compound_type_1_18."e"::text as "67",
        __frmcdc_compound_type_1_18."d" as "68",
        __frmcdc_compound_type_1_18."c"::text as "69",
        __frmcdc_compound_type_1_18."b" as "70",
        __frmcdc_compound_type_1_18."a"::text as "71",
        (not (__frmcdc_compound_type_1_18 is null))::text as "72",
        __person_type_function_list__."money"::numeric::text as "73",
        (
          select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
          from unnest(__person_type_function_list__."interval_array") t
        )::text as "74",
        to_char(__person_type_function_list__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "75",
        to_char(date '1970-01-01' + __person_type_function_list__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "76",
        to_char(date '1970-01-01' + __person_type_function_list__."time", 'HH24:MI:SS.US'::text) as "77",
        to_char(__person_type_function_list__."date", 'YYYY-MM-DD'::text) as "78",
        to_char(__person_type_function_list__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "79",
        to_char(__person_type_function_list__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "80",
        __person_type_function_list__."an_int_range"::text as "81",
        json_build_array(
          lower_inc(__person_type_function_list__."daterange"),
          to_char(lower(__person_type_function_list__."daterange"), 'YYYY-MM-DD'::text),
          to_char(upper(__person_type_function_list__."daterange"), 'YYYY-MM-DD'::text),
          upper_inc(__person_type_function_list__."daterange")
        )::text as "82",
        __person_type_function_list__."numrange"::text as "83",
        __person_type_function_list__."nullable_range"::text as "84",
        __person_type_function_list__."jsonb"::text as "85",
        __person_type_function_list__."json"::text as "86",
        __person_type_function_list__."text_array"::text as "87",
        __person_type_function_list__."domain2"::text as "88",
        __person_type_function_list__."domain"::text as "89",
        __person_type_function_list__."enum_array"::text as "90",
        __person_type_function_list__."enum"::text as "91",
        __person_type_function_list__."varchar" as "92",
        __person_type_function_list__."boolean"::text as "93",
        __person_type_function_list__."decimal"::text as "94",
        __person_type_function_list__."numeric"::text as "95",
        __person_type_function_list__."bigint"::text as "96"
      from unnest("c"."person_type_function_list"(__person__)) as __person_type_function_list__
      left outer join "a"."post" as __post_5
      on (__person_type_function_list__."id"::"int4" = __post_5."id")
      left outer join "a"."post" as __post_6
      on (__person_type_function_list__."smallint"::"int4" = __post_6."id")
      left outer join lateral (select (__person_type_function_list__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_5
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_5."b").*) as __frmcdc_compound_type_1_13
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_5."a").*) as __frmcdc_compound_type_1_14
      on TRUE
      left outer join lateral (select (__person_type_function_list__."nullable_compound_type").*) as __frmcdc_compound_type_1_15
      on TRUE
      left outer join lateral (select (__person_type_function_list__."nested_compound_type").*) as __frmcdc_nested_compound_type_1_6
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_6."b").*) as __frmcdc_compound_type_1_16
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_6."a").*) as __frmcdc_compound_type_1_17
      on TRUE
      left outer join lateral (select (__person_type_function_list__."compound_type").*) as __frmcdc_compound_type_1_18
      on TRUE
    ) _) as "2",
    __post_7."headline" as "3",
    __post_7."id"::text as "4",
    __person_type_function__."id"::text as "5",
    __post_8."headline" as "6",
    __post_8."id"::text as "7",
    __person_type_function__."smallint"::text as "8",
    __person_type_function__."int8_array_domain"::text as "9",
    __person_type_function__."text_array_domain"::text as "10",
    __person_type_function__."regdictionary"::text as "11",
    __person_type_function__."regconfig"::text as "12",
    __person_type_function__."regtype"::text as "13",
    __person_type_function__."regclass"::text as "14",
    __person_type_function__."regoperator"::text as "15",
    __person_type_function__."regoper"::text as "16",
    __person_type_function__."regprocedure"::text as "17",
    __person_type_function__."regproc"::text as "18",
    __person_type_function__."macaddr"::text as "19",
    __person_type_function__."cidr"::text as "20",
    __person_type_function__."inet"::text as "21",
    __person_type_function__."nullablePoint"::text as "22",
    __person_type_function__."point"::text as "23",
    __frmcdc_nested_compound_type_1_7."baz_buz"::text as "24",
    __frmcdc_compound_type_1_19."foo_bar"::text as "25",
    __frmcdc_compound_type_1_19."f"::text as "26",
    __frmcdc_compound_type_1_19."e"::text as "27",
    __frmcdc_compound_type_1_19."d" as "28",
    __frmcdc_compound_type_1_19."c"::text as "29",
    __frmcdc_compound_type_1_19."b" as "30",
    __frmcdc_compound_type_1_19."a"::text as "31",
    (not (__frmcdc_compound_type_1_19 is null))::text as "32",
    __frmcdc_compound_type_1_20."foo_bar"::text as "33",
    __frmcdc_compound_type_1_20."f"::text as "34",
    __frmcdc_compound_type_1_20."e"::text as "35",
    __frmcdc_compound_type_1_20."d" as "36",
    __frmcdc_compound_type_1_20."c"::text as "37",
    __frmcdc_compound_type_1_20."b" as "38",
    __frmcdc_compound_type_1_20."a"::text as "39",
    (not (__frmcdc_compound_type_1_20 is null))::text as "40",
    (not (__frmcdc_nested_compound_type_1_7 is null))::text as "41",
    __frmcdc_compound_type_1_21."foo_bar"::text as "42",
    __frmcdc_compound_type_1_21."f"::text as "43",
    __frmcdc_compound_type_1_21."e"::text as "44",
    __frmcdc_compound_type_1_21."d" as "45",
    __frmcdc_compound_type_1_21."c"::text as "46",
    __frmcdc_compound_type_1_21."b" as "47",
    __frmcdc_compound_type_1_21."a"::text as "48",
    (not (__frmcdc_compound_type_1_21 is null))::text as "49",
    __frmcdc_nested_compound_type_1_8."baz_buz"::text as "50",
    __frmcdc_compound_type_1_22."foo_bar"::text as "51",
    __frmcdc_compound_type_1_22."f"::text as "52",
    __frmcdc_compound_type_1_22."e"::text as "53",
    __frmcdc_compound_type_1_22."d" as "54",
    __frmcdc_compound_type_1_22."c"::text as "55",
    __frmcdc_compound_type_1_22."b" as "56",
    __frmcdc_compound_type_1_22."a"::text as "57",
    (not (__frmcdc_compound_type_1_22 is null))::text as "58",
    __frmcdc_compound_type_1_23."foo_bar"::text as "59",
    __frmcdc_compound_type_1_23."f"::text as "60",
    __frmcdc_compound_type_1_23."e"::text as "61",
    __frmcdc_compound_type_1_23."d" as "62",
    __frmcdc_compound_type_1_23."c"::text as "63",
    __frmcdc_compound_type_1_23."b" as "64",
    __frmcdc_compound_type_1_23."a"::text as "65",
    (not (__frmcdc_compound_type_1_23 is null))::text as "66",
    (not (__frmcdc_nested_compound_type_1_8 is null))::text as "67",
    __frmcdc_compound_type_1_24."foo_bar"::text as "68",
    __frmcdc_compound_type_1_24."f"::text as "69",
    __frmcdc_compound_type_1_24."e"::text as "70",
    __frmcdc_compound_type_1_24."d" as "71",
    __frmcdc_compound_type_1_24."c"::text as "72",
    __frmcdc_compound_type_1_24."b" as "73",
    __frmcdc_compound_type_1_24."a"::text as "74",
    (not (__frmcdc_compound_type_1_24 is null))::text as "75",
    __person_type_function__."money"::numeric::text as "76",
    (
      select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
      from unnest(__person_type_function__."interval_array") t
    )::text as "77",
    to_char(__person_type_function__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "78",
    to_char(date '1970-01-01' + __person_type_function__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "79",
    to_char(date '1970-01-01' + __person_type_function__."time", 'HH24:MI:SS.US'::text) as "80",
    to_char(__person_type_function__."date", 'YYYY-MM-DD'::text) as "81",
    to_char(__person_type_function__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "82",
    to_char(__person_type_function__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "83",
    __person_type_function__."an_int_range"::text as "84",
    json_build_array(
      lower_inc(__person_type_function__."daterange"),
      to_char(lower(__person_type_function__."daterange"), 'YYYY-MM-DD'::text),
      to_char(upper(__person_type_function__."daterange"), 'YYYY-MM-DD'::text),
      upper_inc(__person_type_function__."daterange")
    )::text as "85",
    __person_type_function__."numrange"::text as "86",
    __person_type_function__."nullable_range"::text as "87",
    __person_type_function__."jsonb"::text as "88",
    __person_type_function__."json"::text as "89",
    __person_type_function__."text_array"::text as "90",
    __person_type_function__."domain2"::text as "91",
    __person_type_function__."domain"::text as "92",
    __person_type_function__."enum_array"::text as "93",
    __person_type_function__."enum"::text as "94",
    __person_type_function__."varchar" as "95",
    __person_type_function__."boolean"::text as "96",
    __person_type_function__."decimal"::text as "97",
    __person_type_function__."numeric"::text as "98",
    __person_type_function__."bigint"::text as "99",
    __person__."id"::text as "100",
    __person_identifiers__.idx as "101"
  from "c"."person" as __person__
  left outer join "c"."person_type_function"(
    __person__,
    __person_identifiers__."id1"
  ) as __person_type_function__
  on TRUE
  left outer join "a"."post" as __post_7
  on (__person_type_function__."id"::"int4" = __post_7."id")
  left outer join "a"."post" as __post_8
  on (__person_type_function__."smallint"::"int4" = __post_8."id")
  left outer join lateral (select (__person_type_function__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_7
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_7."b").*) as __frmcdc_compound_type_1_19
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_7."a").*) as __frmcdc_compound_type_1_20
  on TRUE
  left outer join lateral (select (__person_type_function__."nullable_compound_type").*) as __frmcdc_compound_type_1_21
  on TRUE
  left outer join lateral (select (__person_type_function__."nested_compound_type").*) as __frmcdc_nested_compound_type_1_8
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_8."b").*) as __frmcdc_compound_type_1_22
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_8."a").*) as __frmcdc_compound_type_1_23
  on TRUE
  left outer join lateral (select (__person_type_function__."compound_type").*) as __frmcdc_compound_type_1_24
  on TRUE
  where (
    __person__."id" = __person_identifiers__."id0"
  )
  order by __person__."id" asc
) as __person_result__;

select __post_result__.*
from (
  select
    ids.ordinality - 1 as idx,
    (ids.value->>0)::"int4" as "id0"
  from json_array_elements($1::json) with ordinality as ids
) as __post_identifiers__,
lateral (
  select
    (select json_agg(_) from (
      select
        (count(*))::text as "0"
      from "b"."types" as __types__
      where (
        __post__."id"::"int2" = __types__."smallint"
      )
    ) _) as "0",
    (select json_agg(_) from (
      select
        __types__."id"::text as "0",
        __post_2."headline" as "1",
        __post_2."id"::text as "2",
        __post_3."headline" as "3",
        __post_3."id"::text as "4",
        __types__."smallint"::text as "5",
        __types__."int8_array_domain"::text as "6",
        __types__."text_array_domain"::text as "7",
        __types__."regdictionary"::text as "8",
        __types__."regconfig"::text as "9",
        __types__."regtype"::text as "10",
        __types__."regclass"::text as "11",
        __types__."regoperator"::text as "12",
        __types__."regoper"::text as "13",
        __types__."regprocedure"::text as "14",
        __types__."regproc"::text as "15",
        __types__."macaddr"::text as "16",
        __types__."cidr"::text as "17",
        __types__."inet"::text as "18",
        __types__."nullablePoint"::text as "19",
        __types__."point"::text as "20",
        __frmcdc_nested_compound_type_1__."baz_buz"::text as "21",
        __frmcdc_compound_type_1__."foo_bar"::text as "22",
        __frmcdc_compound_type_1__."f"::text as "23",
        __frmcdc_compound_type_1__."e"::text as "24",
        __frmcdc_compound_type_1__."d" as "25",
        __frmcdc_compound_type_1__."c"::text as "26",
        __frmcdc_compound_type_1__."b" as "27",
        __frmcdc_compound_type_1__."a"::text as "28",
        (not (__frmcdc_compound_type_1__ is null))::text as "29",
        __frmcdc_compound_type_1_2."foo_bar"::text as "30",
        __frmcdc_compound_type_1_2."f"::text as "31",
        __frmcdc_compound_type_1_2."e"::text as "32",
        __frmcdc_compound_type_1_2."d" as "33",
        __frmcdc_compound_type_1_2."c"::text as "34",
        __frmcdc_compound_type_1_2."b" as "35",
        __frmcdc_compound_type_1_2."a"::text as "36",
        (not (__frmcdc_compound_type_1_2 is null))::text as "37",
        (not (__frmcdc_nested_compound_type_1__ is null))::text as "38",
        __frmcdc_compound_type_1_3."foo_bar"::text as "39",
        __frmcdc_compound_type_1_3."f"::text as "40",
        __frmcdc_compound_type_1_3."e"::text as "41",
        __frmcdc_compound_type_1_3."d" as "42",
        __frmcdc_compound_type_1_3."c"::text as "43",
        __frmcdc_compound_type_1_3."b" as "44",
        __frmcdc_compound_type_1_3."a"::text as "45",
        (not (__frmcdc_compound_type_1_3 is null))::text as "46",
        __frmcdc_nested_compound_type_1_2."baz_buz"::text as "47",
        __frmcdc_compound_type_1_4."foo_bar"::text as "48",
        __frmcdc_compound_type_1_4."f"::text as "49",
        __frmcdc_compound_type_1_4."e"::text as "50",
        __frmcdc_compound_type_1_4."d" as "51",
        __frmcdc_compound_type_1_4."c"::text as "52",
        __frmcdc_compound_type_1_4."b" as "53",
        __frmcdc_compound_type_1_4."a"::text as "54",
        (not (__frmcdc_compound_type_1_4 is null))::text as "55",
        __frmcdc_compound_type_1_5."foo_bar"::text as "56",
        __frmcdc_compound_type_1_5."f"::text as "57",
        __frmcdc_compound_type_1_5."e"::text as "58",
        __frmcdc_compound_type_1_5."d" as "59",
        __frmcdc_compound_type_1_5."c"::text as "60",
        __frmcdc_compound_type_1_5."b" as "61",
        __frmcdc_compound_type_1_5."a"::text as "62",
        (not (__frmcdc_compound_type_1_5 is null))::text as "63",
        (not (__frmcdc_nested_compound_type_1_2 is null))::text as "64",
        __frmcdc_compound_type_1_6."foo_bar"::text as "65",
        __frmcdc_compound_type_1_6."f"::text as "66",
        __frmcdc_compound_type_1_6."e"::text as "67",
        __frmcdc_compound_type_1_6."d" as "68",
        __frmcdc_compound_type_1_6."c"::text as "69",
        __frmcdc_compound_type_1_6."b" as "70",
        __frmcdc_compound_type_1_6."a"::text as "71",
        (not (__frmcdc_compound_type_1_6 is null))::text as "72",
        __types__."money"::numeric::text as "73",
        (
          select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
          from unnest(__types__."interval_array") t
        )::text as "74",
        to_char(__types__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "75",
        to_char(date '1970-01-01' + __types__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "76",
        to_char(date '1970-01-01' + __types__."time", 'HH24:MI:SS.US'::text) as "77",
        to_char(__types__."date", 'YYYY-MM-DD'::text) as "78",
        to_char(__types__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "79",
        to_char(__types__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "80",
        __types__."an_int_range"::text as "81",
        json_build_array(
          lower_inc(__types__."daterange"),
          to_char(lower(__types__."daterange"), 'YYYY-MM-DD'::text),
          to_char(upper(__types__."daterange"), 'YYYY-MM-DD'::text),
          upper_inc(__types__."daterange")
        )::text as "82",
        __types__."numrange"::text as "83",
        __types__."nullable_range"::text as "84",
        __types__."jsonb"::text as "85",
        __types__."json"::text as "86",
        __types__."text_array"::text as "87",
        __types__."domain2"::text as "88",
        __types__."domain"::text as "89",
        __types__."enum_array"::text as "90",
        __types__."enum"::text as "91",
        __types__."varchar" as "92",
        __types__."boolean"::text as "93",
        __types__."decimal"::text as "94",
        __types__."numeric"::text as "95",
        __types__."bigint"::text as "96",
        __post_4."headline" as "97",
        __post_4."id"::text as "98",
        __post_5."headline" as "99",
        __post_5."id"::text as "100",
        __frmcdc_nested_compound_type_1_3."baz_buz"::text as "101",
        __frmcdc_compound_type_1_7."foo_bar"::text as "102",
        __frmcdc_compound_type_1_7."f"::text as "103",
        __frmcdc_compound_type_1_7."e"::text as "104",
        __frmcdc_compound_type_1_7."d" as "105",
        __frmcdc_compound_type_1_7."c"::text as "106",
        __frmcdc_compound_type_1_7."b" as "107",
        __frmcdc_compound_type_1_7."a"::text as "108",
        (not (__frmcdc_compound_type_1_7 is null))::text as "109",
        __frmcdc_compound_type_1_8."foo_bar"::text as "110",
        __frmcdc_compound_type_1_8."f"::text as "111",
        __frmcdc_compound_type_1_8."e"::text as "112",
        __frmcdc_compound_type_1_8."d" as "113",
        __frmcdc_compound_type_1_8."c"::text as "114",
        __frmcdc_compound_type_1_8."b" as "115",
        __frmcdc_compound_type_1_8."a"::text as "116",
        (not (__frmcdc_compound_type_1_8 is null))::text as "117",
        (not (__frmcdc_nested_compound_type_1_3 is null))::text as "118",
        __frmcdc_compound_type_1_9."foo_bar"::text as "119",
        __frmcdc_compound_type_1_9."f"::text as "120",
        __frmcdc_compound_type_1_9."e"::text as "121",
        __frmcdc_compound_type_1_9."d" as "122",
        __frmcdc_compound_type_1_9."c"::text as "123",
        __frmcdc_compound_type_1_9."b" as "124",
        __frmcdc_compound_type_1_9."a"::text as "125",
        (not (__frmcdc_compound_type_1_9 is null))::text as "126",
        __frmcdc_nested_compound_type_1_4."baz_buz"::text as "127",
        __frmcdc_compound_type_1_10."foo_bar"::text as "128",
        __frmcdc_compound_type_1_10."f"::text as "129",
        __frmcdc_compound_type_1_10."e"::text as "130",
        __frmcdc_compound_type_1_10."d" as "131",
        __frmcdc_compound_type_1_10."c"::text as "132",
        __frmcdc_compound_type_1_10."b" as "133",
        __frmcdc_compound_type_1_10."a"::text as "134",
        (not (__frmcdc_compound_type_1_10 is null))::text as "135",
        __frmcdc_compound_type_1_11."foo_bar"::text as "136",
        __frmcdc_compound_type_1_11."f"::text as "137",
        __frmcdc_compound_type_1_11."e"::text as "138",
        __frmcdc_compound_type_1_11."d" as "139",
        __frmcdc_compound_type_1_11."c"::text as "140",
        __frmcdc_compound_type_1_11."b" as "141",
        __frmcdc_compound_type_1_11."a"::text as "142",
        (not (__frmcdc_compound_type_1_11 is null))::text as "143",
        (not (__frmcdc_nested_compound_type_1_4 is null))::text as "144",
        __frmcdc_compound_type_1_12."foo_bar"::text as "145",
        __frmcdc_compound_type_1_12."f"::text as "146",
        __frmcdc_compound_type_1_12."e"::text as "147",
        __frmcdc_compound_type_1_12."d" as "148",
        __frmcdc_compound_type_1_12."c"::text as "149",
        __frmcdc_compound_type_1_12."b" as "150",
        __frmcdc_compound_type_1_12."a"::text as "151",
        (not (__frmcdc_compound_type_1_12 is null))::text as "152"
      from "b"."types" as __types__
      left outer join "a"."post" as __post_2
      on (__types__."id"::"int4" = __post_2."id")
      left outer join "a"."post" as __post_3
      on (__types__."smallint"::"int4" = __post_3."id")
      left outer join lateral (select (__types__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1__
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1__."b").*) as __frmcdc_compound_type_1__
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1__."a").*) as __frmcdc_compound_type_1_2
      on TRUE
      left outer join lateral (select (__types__."nullable_compound_type").*) as __frmcdc_compound_type_1_3
      on TRUE
      left outer join lateral (select (__types__."nested_compound_type").*) as __frmcdc_nested_compound_type_1_2
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_2."b").*) as __frmcdc_compound_type_1_4
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_2."a").*) as __frmcdc_compound_type_1_5
      on TRUE
      left outer join lateral (select (__types__."compound_type").*) as __frmcdc_compound_type_1_6
      on TRUE
      left outer join "a"."post" as __post_4
      on (__types__."id"::"int4" = __post_4."id")
      left outer join "a"."post" as __post_5
      on (__types__."smallint"::"int4" = __post_5."id")
      left outer join lateral (select (__types__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_3
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_3."b").*) as __frmcdc_compound_type_1_7
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_3."a").*) as __frmcdc_compound_type_1_8
      on TRUE
      left outer join lateral (select (__types__."nullable_compound_type").*) as __frmcdc_compound_type_1_9
      on TRUE
      left outer join lateral (select (__types__."nested_compound_type").*) as __frmcdc_nested_compound_type_1_4
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_4."b").*) as __frmcdc_compound_type_1_10
      on TRUE
      left outer join lateral (select (__frmcdc_nested_compound_type_1_4."a").*) as __frmcdc_compound_type_1_11
      on TRUE
      left outer join lateral (select (__types__."compound_type").*) as __frmcdc_compound_type_1_12
      on TRUE
      where (
        __post__."id"::"int2" = __types__."smallint"
      )
      order by __types__."id" asc
    ) _) as "1",
    __post_6."headline" as "2",
    __post_6."id"::text as "3",
    __types_2."id"::text as "4",
    __post_7."headline" as "5",
    __post_7."id"::text as "6",
    __types_2."smallint"::text as "7",
    __types_2."int8_array_domain"::text as "8",
    __types_2."text_array_domain"::text as "9",
    __types_2."regdictionary"::text as "10",
    __types_2."regconfig"::text as "11",
    __types_2."regtype"::text as "12",
    __types_2."regclass"::text as "13",
    __types_2."regoperator"::text as "14",
    __types_2."regoper"::text as "15",
    __types_2."regprocedure"::text as "16",
    __types_2."regproc"::text as "17",
    __types_2."macaddr"::text as "18",
    __types_2."cidr"::text as "19",
    __types_2."inet"::text as "20",
    __types_2."nullablePoint"::text as "21",
    __types_2."point"::text as "22",
    __frmcdc_nested_compound_type_1_5."baz_buz"::text as "23",
    __frmcdc_compound_type_1_13."foo_bar"::text as "24",
    __frmcdc_compound_type_1_13."f"::text as "25",
    __frmcdc_compound_type_1_13."e"::text as "26",
    __frmcdc_compound_type_1_13."d" as "27",
    __frmcdc_compound_type_1_13."c"::text as "28",
    __frmcdc_compound_type_1_13."b" as "29",
    __frmcdc_compound_type_1_13."a"::text as "30",
    (not (__frmcdc_compound_type_1_13 is null))::text as "31",
    __frmcdc_compound_type_1_14."foo_bar"::text as "32",
    __frmcdc_compound_type_1_14."f"::text as "33",
    __frmcdc_compound_type_1_14."e"::text as "34",
    __frmcdc_compound_type_1_14."d" as "35",
    __frmcdc_compound_type_1_14."c"::text as "36",
    __frmcdc_compound_type_1_14."b" as "37",
    __frmcdc_compound_type_1_14."a"::text as "38",
    (not (__frmcdc_compound_type_1_14 is null))::text as "39",
    (not (__frmcdc_nested_compound_type_1_5 is null))::text as "40",
    __frmcdc_compound_type_1_15."foo_bar"::text as "41",
    __frmcdc_compound_type_1_15."f"::text as "42",
    __frmcdc_compound_type_1_15."e"::text as "43",
    __frmcdc_compound_type_1_15."d" as "44",
    __frmcdc_compound_type_1_15."c"::text as "45",
    __frmcdc_compound_type_1_15."b" as "46",
    __frmcdc_compound_type_1_15."a"::text as "47",
    (not (__frmcdc_compound_type_1_15 is null))::text as "48",
    __frmcdc_nested_compound_type_1_6."baz_buz"::text as "49",
    __frmcdc_compound_type_1_16."foo_bar"::text as "50",
    __frmcdc_compound_type_1_16."f"::text as "51",
    __frmcdc_compound_type_1_16."e"::text as "52",
    __frmcdc_compound_type_1_16."d" as "53",
    __frmcdc_compound_type_1_16."c"::text as "54",
    __frmcdc_compound_type_1_16."b" as "55",
    __frmcdc_compound_type_1_16."a"::text as "56",
    (not (__frmcdc_compound_type_1_16 is null))::text as "57",
    __frmcdc_compound_type_1_17."foo_bar"::text as "58",
    __frmcdc_compound_type_1_17."f"::text as "59",
    __frmcdc_compound_type_1_17."e"::text as "60",
    __frmcdc_compound_type_1_17."d" as "61",
    __frmcdc_compound_type_1_17."c"::text as "62",
    __frmcdc_compound_type_1_17."b" as "63",
    __frmcdc_compound_type_1_17."a"::text as "64",
    (not (__frmcdc_compound_type_1_17 is null))::text as "65",
    (not (__frmcdc_nested_compound_type_1_6 is null))::text as "66",
    __frmcdc_compound_type_1_18."foo_bar"::text as "67",
    __frmcdc_compound_type_1_18."f"::text as "68",
    __frmcdc_compound_type_1_18."e"::text as "69",
    __frmcdc_compound_type_1_18."d" as "70",
    __frmcdc_compound_type_1_18."c"::text as "71",
    __frmcdc_compound_type_1_18."b" as "72",
    __frmcdc_compound_type_1_18."a"::text as "73",
    (not (__frmcdc_compound_type_1_18 is null))::text as "74",
    __types_2."money"::numeric::text as "75",
    (
      select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
      from unnest(__types_2."interval_array") t
    )::text as "76",
    to_char(__types_2."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "77",
    to_char(date '1970-01-01' + __types_2."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "78",
    to_char(date '1970-01-01' + __types_2."time", 'HH24:MI:SS.US'::text) as "79",
    to_char(__types_2."date", 'YYYY-MM-DD'::text) as "80",
    to_char(__types_2."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "81",
    to_char(__types_2."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "82",
    __types_2."an_int_range"::text as "83",
    json_build_array(
      lower_inc(__types_2."daterange"),
      to_char(lower(__types_2."daterange"), 'YYYY-MM-DD'::text),
      to_char(upper(__types_2."daterange"), 'YYYY-MM-DD'::text),
      upper_inc(__types_2."daterange")
    )::text as "84",
    __types_2."numrange"::text as "85",
    __types_2."nullable_range"::text as "86",
    __types_2."jsonb"::text as "87",
    __types_2."json"::text as "88",
    __types_2."text_array"::text as "89",
    __types_2."domain2"::text as "90",
    __types_2."domain"::text as "91",
    __types_2."enum_array"::text as "92",
    __types_2."enum"::text as "93",
    __types_2."varchar" as "94",
    __types_2."boolean"::text as "95",
    __types_2."decimal"::text as "96",
    __types_2."numeric"::text as "97",
    __types_2."bigint"::text as "98",
    __post__."id"::text as "99",
    __post__."headline" as "100",
    __post_identifiers__.idx as "101"
  from "a"."post" as __post__
  left outer join "b"."types" as __types_2
  on (__post__."id"::"int4" = __types_2."id")
  left outer join "a"."post" as __post_6
  on (__types_2."id"::"int4" = __post_6."id")
  left outer join "a"."post" as __post_7
  on (__types_2."smallint"::"int4" = __post_7."id")
  left outer join lateral (select (__types_2."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_5
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_5."b").*) as __frmcdc_compound_type_1_13
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_5."a").*) as __frmcdc_compound_type_1_14
  on TRUE
  left outer join lateral (select (__types_2."nullable_compound_type").*) as __frmcdc_compound_type_1_15
  on TRUE
  left outer join lateral (select (__types_2."nested_compound_type").*) as __frmcdc_nested_compound_type_1_6
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_6."b").*) as __frmcdc_compound_type_1_16
  on TRUE
  left outer join lateral (select (__frmcdc_nested_compound_type_1_6."a").*) as __frmcdc_compound_type_1_17
  on TRUE
  left outer join lateral (select (__types_2."compound_type").*) as __frmcdc_compound_type_1_18
  on TRUE
  where (
    __post__."id" = __post_identifiers__."id0"
  )
  order by __post__."id" asc
) as __post_result__;

select
  __types__."bigint"::text as "0",
  __types__."numeric"::text as "1",
  __types__."decimal"::text as "2",
  __types__."boolean"::text as "3",
  __types__."varchar" as "4",
  __types__."enum"::text as "5",
  __types__."enum_array"::text as "6",
  __types__."domain"::text as "7",
  __types__."domain2"::text as "8",
  __types__."text_array"::text as "9",
  __types__."json"::text as "10",
  __types__."jsonb"::text as "11",
  __types__."nullable_range"::text as "12",
  __types__."numrange"::text as "13",
  json_build_array(
    lower_inc(__types__."daterange"),
    to_char(lower(__types__."daterange"), 'YYYY-MM-DD'::text),
    to_char(upper(__types__."daterange"), 'YYYY-MM-DD'::text),
    upper_inc(__types__."daterange")
  )::text as "14",
  __types__."an_int_range"::text as "15",
  to_char(__types__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "16",
  to_char(__types__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "17",
  to_char(__types__."date", 'YYYY-MM-DD'::text) as "18",
  to_char(date '1970-01-01' + __types__."time", 'HH24:MI:SS.US'::text) as "19",
  to_char(date '1970-01-01' + __types__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "20",
  to_char(__types__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "21",
  (
    select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
    from unnest(__types__."interval_array") t
  )::text as "22",
  __types__."money"::numeric::text as "23",
  __frmcdc_compound_type_1__."a"::text as "24",
  __frmcdc_compound_type_1__."b" as "25",
  __frmcdc_compound_type_1__."c"::text as "26",
  __frmcdc_compound_type_1__."d" as "27",
  __frmcdc_compound_type_1__."e"::text as "28",
  __frmcdc_compound_type_1__."f"::text as "29",
  __frmcdc_compound_type_1__."foo_bar"::text as "30",
  (not (__frmcdc_compound_type_1__ is null))::text as "31",
  __frmcdc_compound_type_1_2."a"::text as "32",
  __frmcdc_compound_type_1_2."b" as "33",
  __frmcdc_compound_type_1_2."c"::text as "34",
  __frmcdc_compound_type_1_2."d" as "35",
  __frmcdc_compound_type_1_2."e"::text as "36",
  __frmcdc_compound_type_1_2."f"::text as "37",
  __frmcdc_compound_type_1_2."foo_bar"::text as "38",
  (not (__frmcdc_compound_type_1_2 is null))::text as "39",
  __frmcdc_compound_type_1_3."a"::text as "40",
  __frmcdc_compound_type_1_3."b" as "41",
  __frmcdc_compound_type_1_3."c"::text as "42",
  __frmcdc_compound_type_1_3."d" as "43",
  __frmcdc_compound_type_1_3."e"::text as "44",
  __frmcdc_compound_type_1_3."f"::text as "45",
  __frmcdc_compound_type_1_3."foo_bar"::text as "46",
  (not (__frmcdc_compound_type_1_3 is null))::text as "47",
  __frmcdc_nested_compound_type_1__."baz_buz"::text as "48",
  (not (__frmcdc_nested_compound_type_1__ is null))::text as "49",
  __frmcdc_compound_type_1_4."a"::text as "50",
  __frmcdc_compound_type_1_4."b" as "51",
  __frmcdc_compound_type_1_4."c"::text as "52",
  __frmcdc_compound_type_1_4."d" as "53",
  __frmcdc_compound_type_1_4."e"::text as "54",
  __frmcdc_compound_type_1_4."f"::text as "55",
  __frmcdc_compound_type_1_4."foo_bar"::text as "56",
  (not (__frmcdc_compound_type_1_4 is null))::text as "57",
  __frmcdc_compound_type_1_5."a"::text as "58",
  __frmcdc_compound_type_1_5."b" as "59",
  __frmcdc_compound_type_1_5."c"::text as "60",
  __frmcdc_compound_type_1_5."d" as "61",
  __frmcdc_compound_type_1_5."e"::text as "62",
  __frmcdc_compound_type_1_5."f"::text as "63",
  __frmcdc_compound_type_1_5."foo_bar"::text as "64",
  (not (__frmcdc_compound_type_1_5 is null))::text as "65",
  __frmcdc_compound_type_1_6."a"::text as "66",
  __frmcdc_compound_type_1_6."b" as "67",
  __frmcdc_compound_type_1_6."c"::text as "68",
  __frmcdc_compound_type_1_6."d" as "69",
  __frmcdc_compound_type_1_6."e"::text as "70",
  __frmcdc_compound_type_1_6."f"::text as "71",
  __frmcdc_compound_type_1_6."foo_bar"::text as "72",
  (not (__frmcdc_compound_type_1_6 is null))::text as "73",
  __frmcdc_nested_compound_type_1_2."baz_buz"::text as "74",
  (not (__frmcdc_nested_compound_type_1_2 is null))::text as "75",
  __types__."point"::text as "76",
  __types__."nullablePoint"::text as "77",
  __types__."inet"::text as "78",
  __types__."cidr"::text as "79",
  __types__."macaddr"::text as "80",
  __types__."regproc"::text as "81",
  __types__."regprocedure"::text as "82",
  __types__."regoper"::text as "83",
  __types__."regoperator"::text as "84",
  __types__."regclass"::text as "85",
  __types__."regtype"::text as "86",
  __types__."regconfig"::text as "87",
  __types__."regdictionary"::text as "88",
  __types__."text_array_domain"::text as "89",
  __types__."int8_array_domain"::text as "90",
  __post__."id"::text as "91",
  __post__."headline" as "92",
  __types__."smallint"::text as "93",
  __post_2."id"::text as "94",
  __post_2."headline" as "95",
  __types__."id"::text as "96",
  __frmcdc_compound_type_1_7."a"::text as "97",
  __frmcdc_compound_type_1_7."b" as "98",
  __frmcdc_compound_type_1_7."c"::text as "99",
  __frmcdc_compound_type_1_7."d" as "100",
  __frmcdc_compound_type_1_7."e"::text as "101",
  __frmcdc_compound_type_1_7."f"::text as "102",
  __frmcdc_compound_type_1_7."foo_bar"::text as "103",
  (not (__frmcdc_compound_type_1_7 is null))::text as "104",
  __frmcdc_compound_type_1_8."a"::text as "105",
  __frmcdc_compound_type_1_8."b" as "106",
  __frmcdc_compound_type_1_8."c"::text as "107",
  __frmcdc_compound_type_1_8."d" as "108",
  __frmcdc_compound_type_1_8."e"::text as "109",
  __frmcdc_compound_type_1_8."f"::text as "110",
  __frmcdc_compound_type_1_8."foo_bar"::text as "111",
  (not (__frmcdc_compound_type_1_8 is null))::text as "112",
  __frmcdc_compound_type_1_9."a"::text as "113",
  __frmcdc_compound_type_1_9."b" as "114",
  __frmcdc_compound_type_1_9."c"::text as "115",
  __frmcdc_compound_type_1_9."d" as "116",
  __frmcdc_compound_type_1_9."e"::text as "117",
  __frmcdc_compound_type_1_9."f"::text as "118",
  __frmcdc_compound_type_1_9."foo_bar"::text as "119",
  (not (__frmcdc_compound_type_1_9 is null))::text as "120",
  __frmcdc_nested_compound_type_1_3."baz_buz"::text as "121",
  (not (__frmcdc_nested_compound_type_1_3 is null))::text as "122",
  __frmcdc_compound_type_1_10."a"::text as "123",
  __frmcdc_compound_type_1_10."b" as "124",
  __frmcdc_compound_type_1_10."c"::text as "125",
  __frmcdc_compound_type_1_10."d" as "126",
  __frmcdc_compound_type_1_10."e"::text as "127",
  __frmcdc_compound_type_1_10."f"::text as "128",
  __frmcdc_compound_type_1_10."foo_bar"::text as "129",
  (not (__frmcdc_compound_type_1_10 is null))::text as "130",
  __frmcdc_compound_type_1_11."a"::text as "131",
  __frmcdc_compound_type_1_11."b" as "132",
  __frmcdc_compound_type_1_11."c"::text as "133",
  __frmcdc_compound_type_1_11."d" as "134",
  __frmcdc_compound_type_1_11."e"::text as "135",
  __frmcdc_compound_type_1_11."f"::text as "136",
  __frmcdc_compound_type_1_11."foo_bar"::text as "137",
  (not (__frmcdc_compound_type_1_11 is null))::text as "138",
  __frmcdc_compound_type_1_12."a"::text as "139",
  __frmcdc_compound_type_1_12."b" as "140",
  __frmcdc_compound_type_1_12."c"::text as "141",
  __frmcdc_compound_type_1_12."d" as "142",
  __frmcdc_compound_type_1_12."e"::text as "143",
  __frmcdc_compound_type_1_12."f"::text as "144",
  __frmcdc_compound_type_1_12."foo_bar"::text as "145",
  (not (__frmcdc_compound_type_1_12 is null))::text as "146",
  __frmcdc_nested_compound_type_1_4."baz_buz"::text as "147",
  (not (__frmcdc_nested_compound_type_1_4 is null))::text as "148",
  __post_3."id"::text as "149",
  __post_3."headline" as "150",
  __post_4."id"::text as "151",
  __post_4."headline" as "152"
from "b"."types" as __types__
left outer join lateral (select (__types__."compound_type").*) as __frmcdc_compound_type_1__
on TRUE
left outer join lateral (select (__types__."nested_compound_type").*) as __frmcdc_nested_compound_type_1__
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1__."a").*) as __frmcdc_compound_type_1_2
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1__."b").*) as __frmcdc_compound_type_1_3
on TRUE
left outer join lateral (select (__types__."nullable_compound_type").*) as __frmcdc_compound_type_1_4
on TRUE
left outer join lateral (select (__types__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_2
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_2."a").*) as __frmcdc_compound_type_1_5
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_2."b").*) as __frmcdc_compound_type_1_6
on TRUE
left outer join "a"."post" as __post__
on (__types__."smallint"::"int4" = __post__."id")
left outer join "a"."post" as __post_2
on (__types__."id"::"int4" = __post_2."id")
left outer join lateral (select (__types__."compound_type").*) as __frmcdc_compound_type_1_7
on TRUE
left outer join lateral (select (__types__."nested_compound_type").*) as __frmcdc_nested_compound_type_1_3
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_3."a").*) as __frmcdc_compound_type_1_8
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_3."b").*) as __frmcdc_compound_type_1_9
on TRUE
left outer join lateral (select (__types__."nullable_compound_type").*) as __frmcdc_compound_type_1_10
on TRUE
left outer join lateral (select (__types__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_4
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_4."a").*) as __frmcdc_compound_type_1_11
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_4."b").*) as __frmcdc_compound_type_1_12
on TRUE
left outer join "a"."post" as __post_3
on (__types__."smallint"::"int4" = __post_3."id")
left outer join "a"."post" as __post_4
on (__types__."id"::"int4" = __post_4."id")
order by __types__."id" asc;

select
  (count(*))::text as "0"
from "b"."types" as __types__;

select
  (row_number() over (partition by 1))::text as "0",
  __type_function_connection__."id"::text as "1",
  __post__."headline" as "2",
  __post__."id"::text as "3",
  __post_2."headline" as "4",
  __post_2."id"::text as "5",
  __type_function_connection__."smallint"::text as "6",
  __type_function_connection__."int8_array_domain"::text as "7",
  __type_function_connection__."text_array_domain"::text as "8",
  __type_function_connection__."regdictionary"::text as "9",
  __type_function_connection__."regconfig"::text as "10",
  __type_function_connection__."regtype"::text as "11",
  __type_function_connection__."regclass"::text as "12",
  __type_function_connection__."regoperator"::text as "13",
  __type_function_connection__."regoper"::text as "14",
  __type_function_connection__."regprocedure"::text as "15",
  __type_function_connection__."regproc"::text as "16",
  __type_function_connection__."macaddr"::text as "17",
  __type_function_connection__."cidr"::text as "18",
  __type_function_connection__."inet"::text as "19",
  __type_function_connection__."nullablePoint"::text as "20",
  __type_function_connection__."point"::text as "21",
  __frmcdc_nested_compound_type_1__."baz_buz"::text as "22",
  __frmcdc_compound_type_1__."foo_bar"::text as "23",
  __frmcdc_compound_type_1__."f"::text as "24",
  __frmcdc_compound_type_1__."e"::text as "25",
  __frmcdc_compound_type_1__."d" as "26",
  __frmcdc_compound_type_1__."c"::text as "27",
  __frmcdc_compound_type_1__."b" as "28",
  __frmcdc_compound_type_1__."a"::text as "29",
  (not (__frmcdc_compound_type_1__ is null))::text as "30",
  __frmcdc_compound_type_1_2."foo_bar"::text as "31",
  __frmcdc_compound_type_1_2."f"::text as "32",
  __frmcdc_compound_type_1_2."e"::text as "33",
  __frmcdc_compound_type_1_2."d" as "34",
  __frmcdc_compound_type_1_2."c"::text as "35",
  __frmcdc_compound_type_1_2."b" as "36",
  __frmcdc_compound_type_1_2."a"::text as "37",
  (not (__frmcdc_compound_type_1_2 is null))::text as "38",
  (not (__frmcdc_nested_compound_type_1__ is null))::text as "39",
  __frmcdc_compound_type_1_3."foo_bar"::text as "40",
  __frmcdc_compound_type_1_3."f"::text as "41",
  __frmcdc_compound_type_1_3."e"::text as "42",
  __frmcdc_compound_type_1_3."d" as "43",
  __frmcdc_compound_type_1_3."c"::text as "44",
  __frmcdc_compound_type_1_3."b" as "45",
  __frmcdc_compound_type_1_3."a"::text as "46",
  (not (__frmcdc_compound_type_1_3 is null))::text as "47",
  __frmcdc_nested_compound_type_1_2."baz_buz"::text as "48",
  __frmcdc_compound_type_1_4."foo_bar"::text as "49",
  __frmcdc_compound_type_1_4."f"::text as "50",
  __frmcdc_compound_type_1_4."e"::text as "51",
  __frmcdc_compound_type_1_4."d" as "52",
  __frmcdc_compound_type_1_4."c"::text as "53",
  __frmcdc_compound_type_1_4."b" as "54",
  __frmcdc_compound_type_1_4."a"::text as "55",
  (not (__frmcdc_compound_type_1_4 is null))::text as "56",
  __frmcdc_compound_type_1_5."foo_bar"::text as "57",
  __frmcdc_compound_type_1_5."f"::text as "58",
  __frmcdc_compound_type_1_5."e"::text as "59",
  __frmcdc_compound_type_1_5."d" as "60",
  __frmcdc_compound_type_1_5."c"::text as "61",
  __frmcdc_compound_type_1_5."b" as "62",
  __frmcdc_compound_type_1_5."a"::text as "63",
  (not (__frmcdc_compound_type_1_5 is null))::text as "64",
  (not (__frmcdc_nested_compound_type_1_2 is null))::text as "65",
  __frmcdc_compound_type_1_6."foo_bar"::text as "66",
  __frmcdc_compound_type_1_6."f"::text as "67",
  __frmcdc_compound_type_1_6."e"::text as "68",
  __frmcdc_compound_type_1_6."d" as "69",
  __frmcdc_compound_type_1_6."c"::text as "70",
  __frmcdc_compound_type_1_6."b" as "71",
  __frmcdc_compound_type_1_6."a"::text as "72",
  (not (__frmcdc_compound_type_1_6 is null))::text as "73",
  __type_function_connection__."money"::numeric::text as "74",
  (
    select array_agg(to_char(t, 'YYYY_MM_DD_HH24_MI_SS.US'::text))
    from unnest(__type_function_connection__."interval_array") t
  )::text as "75",
  to_char(__type_function_connection__."interval", 'YYYY_MM_DD_HH24_MI_SS.US'::text) as "76",
  to_char(date '1970-01-01' + __type_function_connection__."timetz", 'HH24:MI:SS.USTZHTZM'::text) as "77",
  to_char(date '1970-01-01' + __type_function_connection__."time", 'HH24:MI:SS.US'::text) as "78",
  to_char(__type_function_connection__."date", 'YYYY-MM-DD'::text) as "79",
  to_char(__type_function_connection__."timestamptz", 'YYYY-MM-DD"T"HH24:MI:SS.USTZHTZM'::text) as "80",
  to_char(__type_function_connection__."timestamp", 'YYYY-MM-DD"T"HH24:MI:SS.US'::text) as "81",
  __type_function_connection__."an_int_range"::text as "82",
  json_build_array(
    lower_inc(__type_function_connection__."daterange"),
    to_char(lower(__type_function_connection__."daterange"), 'YYYY-MM-DD'::text),
    to_char(upper(__type_function_connection__."daterange"), 'YYYY-MM-DD'::text),
    upper_inc(__type_function_connection__."daterange")
  )::text as "83",
  __type_function_connection__."bigint"::text as "84",
  __type_function_connection__."numeric"::text as "85",
  __type_function_connection__."decimal"::text as "86",
  __type_function_connection__."boolean"::text as "87",
  __type_function_connection__."varchar" as "88",
  __type_function_connection__."enum"::text as "89",
  __type_function_connection__."enum_array"::text as "90",
  __type_function_connection__."domain"::text as "91",
  __type_function_connection__."domain2"::text as "92",
  __type_function_connection__."text_array"::text as "93",
  __type_function_connection__."json"::text as "94",
  __type_function_connection__."jsonb"::text as "95",
  __type_function_connection__."numrange"::text as "96",
  __type_function_connection__."nullable_range"::text as "97",
  __post_3."headline" as "98",
  __post_3."id"::text as "99",
  __post_4."headline" as "100",
  __post_4."id"::text as "101",
  __frmcdc_nested_compound_type_1_3."baz_buz"::text as "102",
  __frmcdc_compound_type_1_7."foo_bar"::text as "103",
  __frmcdc_compound_type_1_7."f"::text as "104",
  __frmcdc_compound_type_1_7."e"::text as "105",
  __frmcdc_compound_type_1_7."d" as "106",
  __frmcdc_compound_type_1_7."c"::text as "107",
  __frmcdc_compound_type_1_7."b" as "108",
  __frmcdc_compound_type_1_7."a"::text as "109",
  (not (__frmcdc_compound_type_1_7 is null))::text as "110",
  __frmcdc_compound_type_1_8."foo_bar"::text as "111",
  __frmcdc_compound_type_1_8."f"::text as "112",
  __frmcdc_compound_type_1_8."e"::text as "113",
  __frmcdc_compound_type_1_8."d" as "114",
  __frmcdc_compound_type_1_8."c"::text as "115",
  __frmcdc_compound_type_1_8."b" as "116",
  __frmcdc_compound_type_1_8."a"::text as "117",
  (not (__frmcdc_compound_type_1_8 is null))::text as "118",
  (not (__frmcdc_nested_compound_type_1_3 is null))::text as "119",
  __frmcdc_compound_type_1_9."foo_bar"::text as "120",
  __frmcdc_compound_type_1_9."f"::text as "121",
  __frmcdc_compound_type_1_9."e"::text as "122",
  __frmcdc_compound_type_1_9."d" as "123",
  __frmcdc_compound_type_1_9."c"::text as "124",
  __frmcdc_compound_type_1_9."b" as "125",
  __frmcdc_compound_type_1_9."a"::text as "126",
  (not (__frmcdc_compound_type_1_9 is null))::text as "127",
  __frmcdc_nested_compound_type_1_4."baz_buz"::text as "128",
  __frmcdc_compound_type_1_10."foo_bar"::text as "129",
  __frmcdc_compound_type_1_10."f"::text as "130",
  __frmcdc_compound_type_1_10."e"::text as "131",
  __frmcdc_compound_type_1_10."d" as "132",
  __frmcdc_compound_type_1_10."c"::text as "133",
  __frmcdc_compound_type_1_10."b" as "134",
  __frmcdc_compound_type_1_10."a"::text as "135",
  (not (__frmcdc_compound_type_1_10 is null))::text as "136",
  __frmcdc_compound_type_1_11."foo_bar"::text as "137",
  __frmcdc_compound_type_1_11."f"::text as "138",
  __frmcdc_compound_type_1_11."e"::text as "139",
  __frmcdc_compound_type_1_11."d" as "140",
  __frmcdc_compound_type_1_11."c"::text as "141",
  __frmcdc_compound_type_1_11."b" as "142",
  __frmcdc_compound_type_1_11."a"::text as "143",
  (not (__frmcdc_compound_type_1_11 is null))::text as "144",
  (not (__frmcdc_nested_compound_type_1_4 is null))::text as "145",
  __frmcdc_compound_type_1_12."a"::text as "146",
  __frmcdc_compound_type_1_12."b" as "147",
  __frmcdc_compound_type_1_12."c"::text as "148",
  __frmcdc_compound_type_1_12."d" as "149",
  __frmcdc_compound_type_1_12."e"::text as "150",
  __frmcdc_compound_type_1_12."f"::text as "151",
  __frmcdc_compound_type_1_12."foo_bar"::text as "152",
  (not (__frmcdc_compound_type_1_12 is null))::text as "153"
from "b"."type_function_connection"() as __type_function_connection__
left outer join "a"."post" as __post__
on (__type_function_connection__."id"::"int4" = __post__."id")
left outer join "a"."post" as __post_2
on (__type_function_connection__."smallint"::"int4" = __post_2."id")
left outer join lateral (select (__type_function_connection__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1__
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1__."b").*) as __frmcdc_compound_type_1__
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1__."a").*) as __frmcdc_compound_type_1_2
on TRUE
left outer join lateral (select (__type_function_connection__."nullable_compound_type").*) as __frmcdc_compound_type_1_3
on TRUE
left outer join lateral (select (__type_function_connection__."nested_compound_type").*) as __frmcdc_nested_compound_type_1_2
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_2."b").*) as __frmcdc_compound_type_1_4
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_2."a").*) as __frmcdc_compound_type_1_5
on TRUE
left outer join lateral (select (__type_function_connection__."compound_type").*) as __frmcdc_compound_type_1_6
on TRUE
left outer join "a"."post" as __post_3
on (__type_function_connection__."id"::"int4" = __post_3."id")
left outer join "a"."post" as __post_4
on (__type_function_connection__."smallint"::"int4" = __post_4."id")
left outer join lateral (select (__type_function_connection__."nullable_nested_compound_type").*) as __frmcdc_nested_compound_type_1_3
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_3."b").*) as __frmcdc_compound_type_1_7
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_3."a").*) as __frmcdc_compound_type_1_8
on TRUE
left outer join lateral (select (__type_function_connection__."nullable_compound_type").*) as __frmcdc_compound_type_1_9
on TRUE
left outer join lateral (select (__type_function_connection__."nested_compound_type").*) as __frmcdc_nested_compound_type_1_4
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_4."b").*) as __frmcdc_compound_type_1_10
on TRUE
left outer join lateral (select (__frmcdc_nested_compound_type_1_4."a").*) as __frmcdc_compound_type_1_11
on TRUE
left outer join lateral (select (__type_function_connection__."compound_type").*) as __frmcdc_compound_type_1_12
on TRUE;

select
  (count(*))::text as "0"
from "b"."type_function_connection"() as __type_function_connection__;