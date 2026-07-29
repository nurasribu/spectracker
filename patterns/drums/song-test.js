setcps(0.5)

stack(
  s("bd*4").gain(".6"),
  s("sd").gain(".5").delay(".1:.125:.3"),
  s("hh*8").gain(".25").room(.15),
  s("hh*4").n("0 2 4 6").gain(".15").speed(".5 .5 .5 .5").delay(".05:.125:.3"),
  s("sawtooth").note("c2 e2 g2 a2").gain(".4 .3 .3 .4").lpf("800:6"),
  s("square").note("<c3 e3 g3> <a3 c4 e4> <f3 a3 c4> <g3 b3 d4>").gain(".15").room(.6).vowel("a i o u"),
  s("triangle").note("c4 d4 e4 g4 a4 g4 e4 d4").gain(".25").delay(".2:.25:.5")
)
