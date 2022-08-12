#include "ASpell.hpp"

void ASpell::launch(const ATarget &atargetref) const {
	atargetref.getHitBySpell((*this));
}
