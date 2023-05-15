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
    expect(transform(code)).toMatchInlineSnapshot(`
      {
        "code": "
      import { defineComponent } from \\"vue\\";

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
      Object.defineProperty(Foo, \\"props\\", {
        value: [\\"a\\",\\"b\\"],
      });

      const Bar = defineComponent(
        <T>(props: P1<T>) => {
          return () => <div>{props}</div>;
        },
      );
      Object.defineProperty(Bar, \\"props\\", {
        value: [\\"a\\"],
      });
      ",
        "map": SourceMap {
          "file": undefined,
          "mappings": "AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;GAAE;AACF;AACA;AACA;AACA;AACA;AACA;;;GAAE;",
          "names": [],
          "sources": [
            "",
          ],
          "sourcesContent": undefined,
          "version": 3,
        },
      }
    `);
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
    expect(transform(code)).toMatchInlineSnapshot(`
      {
        "code": "
      import { defineComponent } from \\"vue\\";

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
      ",
        "map": SourceMap {
          "file": undefined,
          "mappings": "AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;",
          "names": [],
          "sources": [
            "",
          ],
          "sourcesContent": undefined,
          "version": 3,
        },
      }
    `);
  });

  it("should not transform non-functional components", () => {
    const code = `
import { defineComponent } from "vue";

type Props = {
  foo: number
}

const Foo = defineComponent({
  setup(props: Props) {
    return () => <div>{props}</div>;
  },
});`;
    expect(transform(code)).toMatchInlineSnapshot(`
      {
        "code": "
      import { defineComponent } from \\"vue\\";

      type Props = {
        foo: number
      }

      const Foo = defineComponent({
        setup(props: Props) {
          return () => <div>{props}</div>;
        },
      });",
        "map": SourceMap {
          "file": undefined,
          "mappings": "AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA",
          "names": [],
          "sources": [
            "",
          ],
          "sourcesContent": undefined,
          "version": 3,
        },
      }
    `);
  });

  it("should not transform complex type", () => {
    const code = `
import { defineComponent } from "vue";

type Props = 1 extends 1 ? {
  foo: number
} : { a: string }

const Foo = defineComponent((props: Props) => () => <div>{props}></div>);
`;
    expect(transform(code)).toMatchInlineSnapshot(`
      {
        "code": "
      import { defineComponent } from \\"vue\\";

      type Props = 1 extends 1 ? {
        foo: number
      } : { a: string }

      const Foo = defineComponent((props: Props) => () => <div>{props}></div>);
      ",
        "map": SourceMap {
          "file": undefined,
          "mappings": "AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;",
          "names": [],
          "sources": [
            "",
          ],
          "sourcesContent": undefined,
          "version": 3,
        },
      }
    `);
  });

  it("should not transform without type annotation", () => {
    const code = `
import { defineComponent } from "vue";

const Foo = defineComponent((props) => () => <div>{props}></div>);
`;

    expect(transform(code)).toMatchInlineSnapshot(`
      {
        "code": "
      import { defineComponent } from \\"vue\\";

      const Foo = defineComponent((props) => () => <div>{props}></div>);
      ",
        "map": SourceMap {
          "file": undefined,
          "mappings": "AAAA;AACA;AACA;AACA;",
          "names": [],
          "sources": [
            "",
          ],
          "sourcesContent": undefined,
          "version": 3,
        },
      }
    `);
  });

  it("should transform function declaration", () => {
    const code = `
import { defineComponent } from "vue";

type Props = {
  foo: number
}

const Foo = defineComponent(function (props: Props) { return () => <div>{props}></div> });
`;

    expect(transform(code)).toMatchInlineSnapshot(`
      {
        "code": "
      import { defineComponent } from \\"vue\\";

      type Props = {
        foo: number
      }

      const Foo = defineComponent(function (props: Props) { return () => <div>{props}></div> });
      Object.defineProperty(Foo, \\"props\\", {
        value: [\\"foo\\"],
      });
      ",
        "map": SourceMap {
          "file": undefined,
          "mappings": "AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;GAA0F;",
          "names": [],
          "sources": [
            "",
          ],
          "sourcesContent": undefined,
          "version": 3,
        },
      }
    `);
  });

  it("should transform type argument", () => {
    const code = `
import { defineComponent } from "vue";

type Props = {
  foo: number
}

const Foo = defineComponent<Props>((props) => () => <div>{props}></div>);
`;

    expect(transform(code)).toMatchInlineSnapshot(`
      {
        "code": "
      import { defineComponent } from \\"vue\\";

      type Props = {
        foo: number
      }

      const Foo = defineComponent<Props>((props) => () => <div>{props}></div>);
      Object.defineProperty(Foo, \\"props\\", {
        value: [\\"foo\\"],
      });
      ",
        "map": SourceMap {
          "file": undefined,
          "mappings": "AAAA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;;;GAAyE;",
          "names": [],
          "sources": [
            "",
          ],
          "sourcesContent": undefined,
          "version": 3,
        },
      }
    `);
  });
});
