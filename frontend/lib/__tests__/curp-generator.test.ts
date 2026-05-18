import { generateCurpPrefix } from "@/lib/curp-generator"

describe("generateCurpPrefix", () => {
  it("calcula correctamente el prefijo de 16 chars (caso base)", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "García",
        apellidoMaterno: "López",
        nombres: "Juan",
        fechaNacimiento: "1990-05-15",
        genero: "H",
        estado: "Jalisco",
      })
    ).toBe("GALJ900515HJCRPN")
  })

  it("usa X en posiciones 3 y 15 cuando apellido materno está vacío", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "Hernández",
        apellidoMaterno: "",
        nombres: "Pedro",
        fechaNacimiento: "2000-12-01",
        genero: "H",
        estado: "Nuevo León",
      })
    ).toBe("HEXP001201HNLRXD")
  })

  it("omite JOSE cuando hay segundo nombre", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "Martínez",
        apellidoMaterno: "Ruiz",
        nombres: "José Luis",
        fechaNacimiento: "1975-08-20",
        genero: "H",
        estado: "Jalisco",
      })
    ).toBe("MARL750820HJCRZS")
  })

  it("reemplaza pos 2 con X cuando las 4 letras forman palabra inconveniente", () => {
    // BUENDIA/ELIZONDO/IGNACIO → B-U-E-I = BUEI (inconveniente) → BXEI
    expect(
      generateCurpPrefix({
        apellidoPaterno: "Buendía",
        apellidoMaterno: "Elizondo",
        nombres: "Ignacio",
        fechaNacimiento: "1988-07-14",
        genero: "M",
        estado: "Nuevo León",
      })
    ).toBe("BXEI880714MNLNLG")
  })

  it("retorna cadena vacía si faltan campos requeridos", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "",
        apellidoMaterno: "López",
        nombres: "Ana",
        fechaNacimiento: "1995-03-10",
        genero: "M",
        estado: "Jalisco",
      })
    ).toBe("")
  })

  it("retorna cadena vacía si el estado no está en el catálogo", () => {
    expect(
      generateCurpPrefix({
        apellidoPaterno: "García",
        apellidoMaterno: "López",
        nombres: "Ana",
        fechaNacimiento: "1995-03-10",
        genero: "M",
        estado: "EstadoInexistente",
      })
    ).toBe("")
  })

  it("normaliza acentos y mayúsculas", () => {
    const withAccents = generateCurpPrefix({
      apellidoPaterno: "García",
      apellidoMaterno: "López",
      nombres: "Juan",
      fechaNacimiento: "1990-05-15",
      genero: "H",
      estado: "Jalisco",
    })
    const withoutAccents = generateCurpPrefix({
      apellidoPaterno: "Garcia",
      apellidoMaterno: "Lopez",
      nombres: "Juan",
      fechaNacimiento: "1990-05-15",
      genero: "H",
      estado: "Jalisco",
    })
    expect(withAccents).toBe(withoutAccents)
    expect(withAccents).toBe("GALJ900515HJCRPN")
  })

  it("el resultado siempre tiene exactamente 16 caracteres cuando hay datos", () => {
    const result = generateCurpPrefix({
      apellidoPaterno: "Sánchez",
      apellidoMaterno: "Torres",
      nombres: "María",
      fechaNacimiento: "2001-11-30",
      genero: "M",
      estado: "Veracruz",
    })
    expect(result).toHaveLength(16)
  })
})
