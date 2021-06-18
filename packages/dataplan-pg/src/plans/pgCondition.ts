import type { BasePlan, ExecutablePlan } from "graphile-crystal";
import { ModifierPlan } from "graphile-crystal";
import type { SQL } from "pg-sql2";

export interface PgConditionCapableParentPlan extends BasePlan {
  alias: SQL;
  placeholder($plan: ExecutablePlan<any>, type: SQL): SQL;
  where(condition: SQL): void;
}

export class PgConditionPlan<
  TParentPlan extends PgConditionCapableParentPlan,
> extends ModifierPlan<TParentPlan> {
  private conditions: SQL[] = [];

  // TODO: rename this?
  public readonly tableAlias: SQL;

  constructor($parent: TParentPlan) {
    super($parent);
    this.tableAlias = $parent.alias;
  }

  where(condition: SQL): void {
    this.conditions.push(condition);
  }

  placeholder($plan: ExecutablePlan<any>, type: SQL): SQL {
    return this.$parent.placeholder($plan, type);
  }

  apply(): void {
    this.conditions.forEach((condition) => this.$parent.where(condition));
  }
}
