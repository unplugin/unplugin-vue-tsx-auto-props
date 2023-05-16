import { describe, expect, it } from "vitest";

import { transform } from "../src/core/transform";

describe("should", () => {
  it("transform", () => {
    const code = `
import { defineComponent } from "vue";

interface Props<T> {
  a: number;
  b: {
    some: boolean
  }
}

type P1 = {
  a: 1
}

const Foo = defineComponent(
  <T>(props: Props<T>) => {
    return () => <div>{props}</div>;
  },
);

const Bar = defineComponent(
  <T>(props: P1<T>) => {
    return () => <div>{props}</div>;
  },
);
`;
    expect(transform(code)).toMatchSnapshot();
  });

  it("should not transform default export", () => {
    const code = `
import { defineComponent } from "vue";

interface Props<T> {
  a: number;
  b: {
    some: boolean
  }
}
export default defineComponent(
  <T>(props: Props<T>) => {
    return () => <div>{props}</div>;
  },
);
`;
    expect(transform(code)).toMatchSnapshot();
  });

  it("should transform named export", () => {
    const code = `
import { defineComponent } from "vue";

interface Props<T> {
  a: number;
  b: {
    some: boolean
  }
}
export const Foo = defineComponent(
  <T>(props: Props<T>) => {
    return () => <div>{props}</div>;
  },
);
`;
    expect(transform(code)).toMatchSnapshot();
  });

  it("should not transform complex type", () => {
    const code = `
import { defineComponent } from "vue";

type Props = 1 extends 1 ? {
  foo: number
} : { a: string }

const Foo = defineComponent((props: Props) => () => <div>{props}></div>);
`;
    expect(transform(code)).toMatchSnapshot();
  });

  it("should not transform without type annotation", () => {
    const code = `
import { defineComponent } from "vue";

const Foo = defineComponent((props) => () => <div>{props}></div>);
`;

    expect(transform(code)).toMatchSnapshot();
  });

  it("should transform function declaration", () => {
    const code = `
import { defineComponent } from "vue";

type Props = {
  foo: number
}

const Foo = defineComponent(function (props: Props) { return () => <div>{props}></div> });
`;

    expect(transform(code)).toMatchSnapshot();
  });

  it("should transform type argument", () => {
    const code = `
import { defineComponent } from "vue";

type Props = {
  foo: number
}

const Foo = defineComponent<Props>((props) => () => <div>{props}></div>);
`;

    expect(transform(code)).toMatchSnapshot();
  });

  it("should transform inline type", () => {
    const code = `
import { defineComponent } from "vue";

const Foo = defineComponent<{ foo: number }>((props) => () => <div>{props}></div>);
`;

    expect(transform(code)).toMatchSnapshot();
  });

  it("should transform inline argument type", () => {
    const code = `
import { defineComponent } from "vue";

const Foo = defineComponent((props: { foo: number }) => () => <div>{props}></div>);
`;

    expect(transform(code)).toMatchSnapshot();
  });

  it("should transform setup option", () => {
    const code = `
import { defineComponent } from "vue";

const Foo = defineComponent({
  setup: (props: { foo: number }) => () => <div>{props}></div>
});
`;

    expect(transform(code)).toMatchSnapshot();
  });

  it("should not transform setup option when props is set", () => {
    const code = `
import { defineComponent } from "vue";

const Foo = defineComponent({
  props: {
    foo: Number
  },
  setup: (props: { foo: number }) => () => <div>{props}></div>
});
`;

    expect(transform(code)).toMatchSnapshot();
  });
});
