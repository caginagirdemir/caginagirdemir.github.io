#pragma once

#include "ATarget.hpp"

#include <map>

class TargetGenerator {
	private:
		std::map<std::string, ATarget *> target_array;

	public:
		TargetGenerator() {}
		~TargetGenerator() {
			std::map<std::string, ATarget *>::iterator it_begin = target_array.begin();
			std::map<std::string, ATarget *>::iterator it_end = target_array.end();
			while(it_begin != it_end) {
				delete it_begin->second;
				++it_begin;
			}
			target_array.clear();
		}

		void learnTargetType(ATarget *atargetptr);
		void forgetTargetType(std::string const &atargetname);
		ATarget *createTarget(std::string const &atargetname);
};
