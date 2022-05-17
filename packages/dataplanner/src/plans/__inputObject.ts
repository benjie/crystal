import type { GraphQLInputObjectType, ValueNode } from "graphql";

import type { InputPlan } from "../input.js";
import { inputPlan } from "../input.js";
import { ExecutablePlan } from "../plan.js";
import { defaultValueToValueNode } from "../utils.js";
import { constant } from "./constant.js";

/**
 * Implements `InputObjectPlan`
 */
export class __InputObjectPlan extends ExecutablePlan {
  static $$export = {
    moduleName: "dataplanner",
    exportName: "__InputObjectPlan",
  };
  isSyncAndSafe = true;

  private inputFields: {
    [fieldName: string]: { dependencyIndex: number; plan: InputPlan };
  } = Object.create(null);
  constructor(
    private inputObjectType: GraphQLInputObjectType,
    private inputValues: ValueNode | undefined,
  ) {
    super();
    const inputFieldDefinitions = inputObjectType.getFields();
    const inputFields =
      inputValues?.kind === "ObjectValue" ? inputValues.fields : undefined;
    for (const inputFieldName in inputFieldDefinitions) {
      const inputFieldDefinition = inputFieldDefinitions[inputFieldName];
      const inputFieldType = inputFieldDefinition.type;
      const defaultValue = defaultValueToValueNode(
        inputFieldType,
        inputFieldDefinition.defaultValue,
      );
      const inputFieldValue = inputFields?.find(
        (val) => val.name.value === inputFieldName,
      );
      const plan = inputPlan(
        this.aether,
        inputFieldType,
        inputFieldValue?.value,
        defaultValue,
      );
      this.inputFields[inputFieldName] = {
        plan,
        dependencyIndex: this.addDependency(plan),
      };
    }
  }

  optimize() {
    if (this.inputValues?.kind === "NullValue") {
      return constant(null);
    }
    return this;
  }

  execute(values: any[][]): any[] {
    const count = values[0].length;
    const results = [];
    for (let i = 0; i < count; i++) {
      const resultValues = Object.create(null);
      for (const inputFieldName in this.inputFields) {
        const dependencyIndex =
          this.inputFields[inputFieldName].dependencyIndex;
        if (dependencyIndex == null) {
          throw new Error("inputFieldPlan has gone missing.");
        }
        const value = values[dependencyIndex][i];
        resultValues[inputFieldName] = value;
      }
      results[i] = resultValues;
    }
    return results;
  }

  get(attrName: string): InputPlan {
    const plan = this.inputFields[attrName]?.plan;
    if (plan === undefined) {
      throw new Error(
        `Tried to '.get("${attrName}")', but no such attribute exists on ${this.inputObjectType.name}`,
      );
    }
    return plan;
  }

  eval(): any {
    if (this.inputValues?.kind === "NullValue") {
      return null;
    }
    const resultValues = Object.create(null);
    for (const inputFieldName in this.inputFields) {
      const inputFieldPlan = this.inputFields[inputFieldName].plan;
      resultValues[inputFieldName] = inputFieldPlan.eval();
    }
    return resultValues;
  }

  evalIs(value: null | undefined): boolean {
    if (value === undefined) {
      return this.inputValues === value;
    } else if (value === null) {
      return this.inputValues?.kind === "NullValue";
    } else {
      throw new Error(
        "__InputObjectPlan cannot evalIs values other than null and undefined currently",
      );
    }
  }

  // Written without consulting spec.
  evalHas(attrName: string): boolean {
    if (!this.inputValues) {
      return false;
    }
    if (this.inputValues.kind === "NullValue") {
      return false;
    }
    if (!(attrName in this.inputFields)) {
      return false;
    }
    return !this.inputFields[attrName].plan.evalIs(undefined);
  }
}
