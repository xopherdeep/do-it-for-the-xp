<template>
  <ion-page
    class="my-gold-points"
    :class="rootClass"
    :style="rootStyle"
  >
    <ion-header>
      <ion-toolbar>
        <xp-app-header
          title="My Funds"
          icon="wallet"
          :meta="headerMeta"
        >
          <template #start>
            <xp-back-button></xp-back-button>
          </template>
        </xp-app-header>
      </ion-toolbar>
    </ion-header>

    <ion-content
      v-if="user"
      class="wallet-content"
    >
      <!-- GP: the wallet, its accounts, the money moves and the latest lines of history -->
      <template v-if="tab === 'wallet'">
        <section
          class="wallet-card"
          :class="{ 'is-full': isWalletFull }"
          aria-label="Wallet"
        >
          <div class="wallet-card__top">
            <span class="wallet-card__label"><i class="fad fa-wallet"></i> Wallet</span>
            <span class="wallet-card__max">Max {{ gold(purse.limit) }}</span>
          </div>
          <div class="wallet-card__balance">
            <span
              :key="walletPulse"
              class="wallet-card__amount"
              :class="{ 'is-up': walletDelta > 0, 'is-down': walletDelta < 0 }"
            >{{ gold(walletShown) }}</span>
            <span class="wallet-card__unit">GP</span>
          </div>
          <div
            class="wallet-gauge"
            role="progressbar"
            :aria-valuenow="purse.wallet"
            aria-valuemin="0"
            :aria-valuemax="purse.limit"
          >
            <div
              class="wallet-gauge__fill"
              :style="{ width: `${fill}%` }"
            ></div>
          </div>
          <p class="wallet-card__note">
            <template v-if="isWalletFull">Wallet full! New GP goes to savings.</template>
            <template v-else>{{ gold(purse.limit - purse.wallet) }} more fits in your wallet.</template>
            <span class="wallet-card__worth">Worth {{ gold(netWorth) }}</span>
          </p>
        </section>

        <xp-app-section label="Accounts">
          <xp-app-row
            title="Savings"
            subtitle="Safe at the bank · tap to move GP"
            icon="piggy-bank"
            :chevron="false"
            @click="clickSavings"
          >
            <template #trailing>
              <span class="wallet-amount is-in">{{ gold(purse.savings) }}</span>
            </template>
          </xp-app-row>
          <xp-app-row
            v-if="purse.hospitalBill > 0"
            class="wallet-row--alert"
            title="Hospital bill"
            subtitle="Grounded until it is paid"
            icon="hospital"
            :chevron="false"
            @click="clickDebt"
          >
            <template #trailing>
              <span class="wallet-amount is-out">{{ gold(purse.hospitalBill) }}</span>
            </template>
          </xp-app-row>
          <xp-app-row
            title="Debt"
            :subtitle="purse.debt > 0 ? `You owe the bank · line ${gold(creditLine)}` : `Debt-free · line ${gold(creditLine)}`"
            icon="file-invoice-dollar"
            :chevron="false"
            @click="clickDebt"
          >
            <template #trailing>
              <span
                class="wallet-amount"
                :class="purse.debt > 0 ? 'is-out' : 'is-move'"
              >{{ gold(purse.debt) }}</span>
            </template>
          </xp-app-row>
        </xp-app-section>

        <xp-app-section
          v-if="requests.length"
          label="Asked of you"
        >
          <xp-app-row
            v-for="ask in requests"
            :key="ask.id"
            :title="`${heroName(userStore.users[ask.fromId])} asks for ${gold(ask.amount)}`"
            :subtitle="whenCopy(ask.at)"
            icon="envelope-open-dollar"
            :chevron="false"
          >
            <template #trailing>
              <button
                type="button"
                class="xp-app-btn"
                @click="payAsk(ask.id, ask.fromId)"
              >Pay</button>
              <button
                type="button"
                class="xp-app-btn xp-app-btn--ghost"
                @click="declineAsk(ask.id)"
              >No</button>
            </template>
          </xp-app-row>
        </xp-app-section>

        <xp-app-section label="Transactions">
          <xp-app-row
            title="Pay Loan / Debt"
            :subtitle="debtSubtitle"
            icon="file-invoice-dollar"
            @click="clickDebt"
          />
          <xp-app-row
            title="Cash Out"
            :subtitle="cashOutSubtitle"
            icon="money-bill-wave"
            @click="clickCashOut"
          />
          <xp-app-row
            title="Send / Request"
            subtitle="Share GP with the family, or ask for some"
            icon="envelope-open-dollar"
            @click="clickSendRequest"
          />
        </xp-app-section>

        <xp-app-section
          v-if="pendingCashOuts.length"
          label="Waiting on a Game Master"
        >
          <xp-app-row
            v-for="entry in pendingCashOuts"
            :key="entry.id"
            :title="entry.itemName"
            :subtitle="whenCopy(entry.createdAt)"
            icon="hourglass-half"
            :chevron="false"
          />
        </xp-app-section>

        <xp-app-section label="Recent">
          <template v-if="recent.length">
            <xp-app-row
              v-for="entry in recent"
              :key="entry.id"
              :title="entry.note"
              :subtitle="entrySubtitle(entry)"
              :icon="entryIcon(entry)"
              :chevron="false"
            >
              <template #trailing>
                <span
                  class="wallet-amount"
                  :class="amountClass(entry)"
                >{{ amountText(entry) }}</span>
              </template>
            </xp-app-row>
            <xp-app-row
              title="See all activity"
              icon="receipt"
              @click="selectTab('activity')"
            />
          </template>
          <xp-app-empty
            v-else
            icon="coins"
            :text="copyFor('wallet.empty.recent', words)"
          />
        </xp-app-section>
      </template>

      <!-- Activity: every GP move, filtered by when -->
      <template v-else-if="tab === 'activity'">
        <div
          class="wallet-ranges"
          role="tablist"
          aria-label="Date range"
        >
          <button
            v-for="option in ranges"
            :key="option.id"
            type="button"
            role="tab"
            class="wallet-range"
            :class="{ 'is-active': range === option.id }"
            :aria-selected="range === option.id"
            @click="range = option.id; play$fx('cursor')"
          >{{ option.label }}</button>
        </div>

        <div class="wallet-totals">
          <div class="wallet-total">
            <span class="wallet-total__label">Earned</span>
            <span class="wallet-amount is-in">+{{ gold(totals.earned) }}</span>
          </div>
          <div class="wallet-total">
            <span class="wallet-total__label">Spent</span>
            <span class="wallet-amount is-out">-{{ gold(totals.spent) }}</span>
          </div>
          <div class="wallet-total">
            <span class="wallet-total__label">Net</span>
            <span
              class="wallet-amount"
              :class="totals.net >= 0 ? 'is-in' : 'is-out'"
            >{{ totals.net >= 0 ? "+" : "-" }}{{ gold(Math.abs(totals.net)) }}</span>
          </div>
        </div>

        <template v-if="days.length">
          <xp-app-section
            v-for="group in days"
            :key="group.day"
            :label="group.day"
          >
            <xp-app-row
              v-for="entry in group.entries"
              :key="entry.id"
              :title="entry.note"
              :subtitle="entrySubtitle(entry)"
              :icon="entryIcon(entry)"
              :chevron="false"
            >
              <template #trailing>
                <span
                  class="wallet-amount"
                  :class="amountClass(entry)"
                >{{ amountText(entry) }}</span>
              </template>
            </xp-app-row>
          </xp-app-section>
        </template>
        <xp-app-empty
          v-else
          icon="receipt"
          :text="copyFor(range === 'all' ? 'wallet.empty.recent' : 'wallet.empty.range', words)"
        />
      </template>

      <!-- Wallets: the sizes, where each is sold, and how GP works -->
      <template v-else>
        <xp-app-section label="Wallet sizes">
          <xp-app-row
            v-for="tier in tiers"
            :key="tier.limit"
            :title="`${gold(tier.limit)} wallet`"
            :subtitle="tier.subtitle"
            icon="wallet"
            :active="tier.isCurrent"
            :class="{ 'is-locked': tier.isLocked, 'is-owned': tier.isOwned && !tier.isCurrent }"
            :chevron="false"
          >
            <template #trailing>
              <xp-app-chip
                v-if="tier.isCurrent"
                kind="tag"
                value="Yours"
              />
              <xp-app-chip
                v-else-if="tier.isNext && !tier.isLocked"
                kind="tag"
                value="Next"
              />
              <i
                v-else-if="tier.isLocked"
                class="fad fa-lock wallet-tier__lock"
                aria-label="Locked"
              ></i>
              <i
                v-else-if="tier.isOwned"
                class="fad fa-check wallet-tier__owned"
                aria-label="Owned"
              ></i>
            </template>
          </xp-app-row>
        </xp-app-section>

        <xp-app-section label="How GP works">
          <div class="wallet-about">
            <p><i class="fad fa-coins"></i> Quests, battles and treasure fill your wallet. When it is full, the rest goes to savings.</p>
            <p><i class="fad fa-piggy-bank"></i> Savings never fill up. Move GP in and out from the GP tab or the Gold Bank.</p>
            <p><i class="fad fa-hand-holding-usd"></i> The bank lends up to half your wallet's size ({{ gold(creditLine) }}). You pay back 10% more.</p>
            <p><i class="fad fa-money-bill-wave"></i> Cash out trades GP for real money ({{ cashOut.gpPerDollar }} GP = $1). A Game Master hands it over.</p>
            <p><i class="fad fa-store"></i> Bigger wallets are sold in shops around the world, once you reach their level.</p>
          </div>
        </xp-app-section>
      </template>
    </ion-content>

    <ion-footer class="wallet-footer">
      <xp-app-bottom-nav
        :tabs="tabs"
        :model-value="tab"
        aria-label="Wallet Navigation"
        @change="selectTab"
      />
    </ion-footer>

    <!-- Every question in the game's own prompt, not native alerts -->
    <xp-reveal-prompt
      :prompt="prompt"
      @respond="reveal.submitAnswer"
    />
  </ion-page>
</template>

<script src="./MyGoldPoints.ts" lang="ts" />
<style lang="scss" src="./_MyGoldPoints.scss" />
