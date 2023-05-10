import clsx from "clsx";
import React from "react";

import styles from "./styles.module.css";

const FeatureList = [
  {
    title: "Get started in seconds",
    Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
    description: (
      <>
        <code>npx postgraphile -c postgres://...</code> and you&apos;re running
        ─ try it out without investing large amounts of time!
      </>
    ),
  },
  {
    title: "Craft your perfect API",
    Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
    description: (
      <>
        Don&apos;t just take our defaults, spend a few minutes honing your API
        so it&apos;s the shape that you&apos;ll want it to be for years to come.
      </>
    ),
  },
  {
    title: "Versatile",
    Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    description: (
      <>
        Whether you&apos;re building the backend API for your SaaS, build
        internal tooling for your business, or anything else, PostGraphile has
        your back.
      </>
    ),
  },
];

function Feature({ Svg, title, description }) {
  return (
    <div className={clsx("col col--4", styles.feature)}>
      <div className="">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={clsx("row", styles.row)}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
