import {expect} from "vitest"
import {toHaveNoViolations} from "vitest-axe"
import {generateCardSignatureMove} from "../utils"

expect.extend(toHaveNoViolations)
