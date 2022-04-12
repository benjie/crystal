# graphile-build-pg

[![GitHub Sponsors](https://img.shields.io/github/sponsors/benjie?color=ff69b4&label=github%20sponsors)](https://github.com/sponsors/benjie)
[![Patreon sponsor button](https://img.shields.io/badge/sponsor-via%20Patreon-orange.svg)](https://patreon.com/benjie)
[![Discord chat room](https://img.shields.io/discord/489127045289476126.svg)](http://discord.gg/graphile)
[![Follow](https://img.shields.io/badge/twitter-@GraphileHQ-blue.svg)](https://twitter.com/GraphileHQ)

`graphile-build-pg` is a collection of graphile-build plugins that extend your
GraphQL schema with types and fields based on the tables, views, functions and
other resources in your PostgreSQL database.

This is achieved by introspecting your database with [pg-introspection][] and
then building [@dataplan/pg][] data sources for these entities. Then our plugins
inspect these data sources and create the relevant GraphQL types, fields, and
[dataplanner][] plan resolver functions. The result is a high-performance,
powerful, auto-generated but highly flexible GraphQL schema.

If you don't want to use your database introspection results to generate the
schema, you can instead build the data sources yourself giving you full control
over what goes into your GraphQL API whilst still saving you significant effort
versus writing the schema without auto-generation.

<!-- SPONSORS_BEGIN -->

## Crowd-funded open-source software

To help us develop this software sustainably under the MIT license, we ask all
individuals and businesses that use it to help support its ongoing maintenance
and development via sponsorship.

### [Click here to find out more about sponsors and sponsorship.](https://www.graphile.org/sponsor/)

And please give some love to our featured sponsors 🤩:

<table><tr>
<td align="center"><a href="https://surge.io/"><img src="https://graphile.org/images/sponsors/surge.png" width="90" height="90" alt="Surge" /><br />Surge</a> *</td>
<td align="center"><a href="https://storyscript.com/?utm_source=postgraphile"><img src="https://graphile.org/images/sponsors/storyscript.png" width="90" height="90" alt="Story.ai" /><br />Story.ai</a> *</td>
<td align="center"><a href="http://chads.website"><img src="https://graphile.org/images/sponsors/chadf.png" width="90" height="90" alt="Chad Furman" /><br />Chad Furman</a> *</td>
<td align="center"><a href="https://www.the-guild.dev/"><img src="https://graphile.org/images/sponsors/theguild.png" width="90" height="90" alt="The Guild" /><br />The Guild</a> *</td>
</tr><tr>
<td align="center"><a href="https://www.fanatics.com/"><img src="https://graphile.org/images/sponsors/fanatics.png" width="90" height="90" alt="Fanatics" /><br />Fanatics</a> *</td>
<td align="center"><a href="https://www.enzuzo.com/"><img src="https://graphile.org/images/sponsors/enzuzo.png" width="90" height="90" alt="Enzuzo" /><br />Enzuzo</a> *</td>
</tr></table>

<em>\* Sponsors the entire Graphile suite</em>

<!-- SPONSORS_END -->

## About

Thanks to DataPlanner's query planning capabilities, the plugins in this package
do not exhibit the N+1 query problem common in many database-based GraphQL APIs;
for all but the flattest GraphQL queries these plugins typically significantly
outperform `DataLoader`-based solutions - and the more complex your GraphQL
query becomes the greater the benefit.

An example of an application built on `graphile-build-pg` is
[PostGraphile](https://github.com/graphile/postgraphile) which with one command
connects to your PostgreSQL database and provides a full highly performant
standards-compliant GraphQL API.
